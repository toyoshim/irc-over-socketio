/**
 * Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */

//-----------------------------------------------------------------------------
// Import libraries
//-----------------------------------------------------------------------------
// ArrayBuffer compatible library is needed in node.js version < 0.5.5.
// heroku uses node.js version 0.4.7.
ArrayBuffer = require('./ArrayBuffer').ArrayBuffer;
DataView = require('./ArrayBuffer').DataView;
Uint8Array = require('./ArrayBuffer').Uint8Array;
Uint32Array = require('./ArrayBuffer').Uint32Array;

// Import common libraries.
var fs = require('fs');
var net = require('net');
var http = require('http');
var socketio = require('socket.io');

// Import a private library.
var MD5 = require('./MD5').MD5;

//-----------------------------------------------------------------------------
// Setup
//-----------------------------------------------------------------------------
// Set version number.
var version = '0.9.0';

// Check password setting.
var pass = process.env.PASSWORD;
if (!pass) {
    console.log("require PASSWORD in env");
    return;
}

// Check /dev/urandom.
var fd = fs.openSync('/dev/urandom', 'r');
fs.close(fd);

// Obtain an available port number.
var port = process.env.PORT || 3000;

//-----------------------------------------------------------------------------
// Start a server.
//-----------------------------------------------------------------------------
// Start http server.
var app = http.createServer();
app.listen(port);

// Start Socket.IO server.
var io = socketio.listen(app);

// Define proxy state.
var STATE = {
    IDLE: 0,  // Waiting client for authentication and proxy request.
    CONNECTING: 1,  // Connecting to IRC server.
    CONNECTED: 2,  // Connected to IRC server.
    DISCONNECTED: 3  // Disconnected from IRC server.
};

// Handle proxy handshake line by line.
// a) Digest mismatch.
//  1. C <- S : HELLO ij v0.9.0 (<nonce>)
//  2. C -> S : DIGEST <md5(<nonce>:<pass>)>
//  3. C <- S : DISCONNECTED digest mismatch
//  4. C <- S : [disconnect]
// b) Pass proxy digest authentication, but could not connect to remote server.
//  1. C <- S : HELLO ij v0.9.0 (<nonce>)
//  2. C -> S : DIGEST <md5(<nonce>:<pass>)>
//  3. C -> S : CONNECT <server> <port>
//  4. C <- S : DISCONNECTED from <server>:<port>
//  5. C <- S : [disconnect]
// b) Pass proxy digest authentication, and connect to remote server.
//  1. C <- S : HELLO ij v0.9.0 (<nonce>)
//  2. C -> S : DIGEST <md5(<nonce>:<pass>)>
//  3. C -> S : CONNECT <server> <port>
//  4. C <- S : CONNECTED to <server>:<port>
//  5. C <> S : [proxy handling between client and <server>:<port>]
//  6. C <- S : DISCONNECTED <reason>
//  7. C <- S : [disconnect]
var doHandshake = function (client, message) {
    var command = message.split(' ')[0];
    if (command == 'DIGEST') {
        // Check client sending digest.
        var digest = MD5.createDigestString(client.work.nonce + ':' + pass);
        var clientDigest = message.split(' ')[1];
        if (digest != clientDigest) {
            // Digest mismatch.
            console.log('client digest mismatch: ' + clientDigest);
            client.work.state = STATE.DISCONNECTED;
            client.send('DISCONNECTED digest mismatch\r\n');
            client.emit('disconnect');
        } else {
            // Digest match.
            client.work.digest = digest;
        }
    } else if (client.work.digest && command == 'CONNECT') {
        // CONNECT request without DIGEST authentication will be ignored.
        // Handle 'CONNECT <host> <port>'.
        var args = message.split(' ');
        var host = args[1];
        var port = Number(args[2]);
        console.log('client proxy connecting to ' + host + ':' + port);
        client.work.state = STATE.CONNECTING;

        // Open connection to <host>:<port>.
        client.work.irc = net.createConnection(port, host);
        client.work.irc.client = client;
        client.work.irc.host = host;
        client.work.irc.port = port;

        // Register handlers for a socket to the remote IRC server.
        client.work.irc.on('connect', function () {
            // Connect to IRC server.
            var hostport = client.host + ':' + client.port;
            client.work.state = STATE.CONNECTED;
            client.send('CONNECTED to ' + hostport + '\n');
            console.log('client proxy connected');
        });
        client.work.irc.on('data', function (data) {
            // Receive data from IRC server send it back to the client.
            client.send(data.toString());
        });
        client.work.irc.on('end', function () {
            // Detect EOF on connection to the IRC server.
            client.work.state = STATE.DISCONNECTED;
            client.send('DISCONNECTED from ' + host + ':' + port + '\n');
            client.emit('disconnect');
        });
        client.work.irc.on('error', function () {
            console.log('client proxy connection failed');
            client.work.state = STATE.DISCONNECTED;
            var hostport = host + ':' + port;
            client.send('DISCONNECTED from ' + hostport + 'for an error\n');
            client.emit('disconnect');
        });
    }
};

// Accept new client.
io.on('connection', function (client) {
    // Initialize variables.
    client.work = {
        state: STATE.IDLE,  // Handshake state.
        buffer: '',  // Receiving buffer on client data.
        nonce: '',  // Nonce generated when the connection establishes.
        digest: '',  // Correct digest which is sent by client.
        irc: null  // Socket object to the remote server.
    };

    // Register handlers.
    client.on('message', function (event) {
        if (client.work.state == STATE.IDLE) {
            // Handle incoming data line by line for handshake.
            var lines = (this.work.buffer + event).split('\n');
            var lastLine = lines.length - 1;
            this.work.buffer = lines[lastLine];
            for (var i = 0; i < lastLine; i++) {
                if (lines[i].charAt(lines[i].length - 1) == '\r')
                    lines[i] = lines[i].slice(0, lines[i].length - 1);
                // State might be changed.
                if (client.work.state == STATE.CONNECTED)
                    client.work.irc.write(lines[i] + '\r\n');
                else if (client.work.state == STATE.IDLE)
                    doHandshake(client, lines[i]);
            }
        } else if (client.work.state == STATE.CONNECTING) {
            // Do nothing.
        } else if (client.work.state == STATE.CONNECTED) {
            // Do proxy.
            if (client.work.buffer) {
                client.work.irc.write(client.work.buffer);
                client.work.buffer = '';
            }
            client.work.irc.write(event);
        }
    });
    client.on('disconnect', function () {
        console.log('client disconnected');
    });

    // Create a nonce.
    var fd = fs.openSync('/dev/urandom', 'r');
    client.work.nonce = fs.readSync(fd, 33, 0, 'base64')[0];
    fs.close(fd);

    // Send HELLO.
    client.send('HELLO ij v' + version + ' (' + client.work.nonce + ')');
});