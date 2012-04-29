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

// Obtains an available port number.
var port = process.env.PORT || 3000;

//-----------------------------------------------------------------------------
// Start a server.
//-----------------------------------------------------------------------------
// Start http server.
var app = http.createServer();
app.listen(port);

// Start Socket.IO server.
var io = socketio.listen(app);

// Accept new client.
io.on('connection', function (client) {
    // Initialize variables.
    client.work = { state: 0, buffer: '', nonce: '', digest: '', irc: null };

    // Register handlers.
    client.on('message', function (event) {
        if (client.work.state == 0) {
            // State: connected
            // Handle incoming data line by line for handshake.
            var lines = (this.work.buffer + event).split('\n');
            var lastLine = lines.length - 1;
            this.work.buffer = lines[lastLine];
            for (var i = 0; i < lastLine; i++) {
                if (lines[i].charAt(lines[i].length - 1) == '\r')
                    lines[i] = lines[i].slice(0, lines[i].length - 1);
                client.handshake(lines[i]);
            }
        } else if (client.work.state == 1) {
            // State: connecting to proxy
            // Do nothing.
        } else if (client.work.state == 2) {
            // State: proxy connection established
            // Do proxy.
            client.work.irc.write(event);
        }
    });
    client.on('disconnect', function () {
        console.log('client disconnected');
    });

    // Handles handshake.
    client.handshake = function (message) {
        var command = message.split(' ')[0];
        if (command == 'DIGEST') {
            // Check client sending digest.
            var digest = MD5.createDigestString(this.work.nonce + ':' + pass);
            var clientDigest = message.split(' ')[1];
            if (digest != clientDigest) {
                console.log('client digest mismatch: ' + clientDigest);
                this.send('QUIT digest mismatch\r\n');
                this.emit('disconnect');
            } else {
                this.work.digest = digest;
            }
        } else if (this.work.digest && command == 'CONNECT') {
            // Start connecting to IRC server.
            var args = message.split(' ');
            var host = args[1];
            var port = Number(args[2]);
            console.log('client proxy connecting to ' + host + ':' + port);
            this.work.state = 1;
            this.work.irc = net.createConnection(port, host);
            this.work.irc.client = this;
            this.work.irc.host = host;
            this.work.irc.port = port;
            // Register handlers.
            this.work.irc.on('connect', function () {
                // Connect to IRC server.
                this.client.work.state = 2;
                this.client.send('CONNECTED to ' + this.host + ':' +
                        this.port + '\n');
                console.log('client proxy connected');
            });
            client.work.irc.on('data', function (data) {
                // Receive data from IRC server.
                // Send it back to the client.
                this.client.send(data.toString());
            });
            client.work.irc.on('end', function () {
                // Detect EOF on connection to the IRC server.
                this.client.work.state = 0;
                this.client.send(
                        'DISCONNECTED from ' + host + ':' + port + '\n');
                this.client.emit('disconnect');
            });
            client.work.irc.on('error', function () {
                console.log('client proxy connection failed');
                this.client.work.state = 0;
                this.client.send('DISCONNECTED because of network error to ' +
                    host + ':' + port + '\n');
                this.client.emit('disconnect');
            });
        }
    };

    // Create a nonce.
    var fd = fs.openSync('/dev/urandom', 'r');
    client.work.nonce = fs.readSync(fd, 33, 0, 'base64')[0];
    fs.close(fd);

    // Send HELLO.
    client.send('HELLO ij v' + version + ' (' + client.work.nonce + ')');
});