/**
 * Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
/**
 * TCP client.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 * @constructor
 */
function TCPClientSocketIO (proxy_server, proxy_port, proxy_pass) {
    this._proxy_status = TCPClientSocketIO._PROXY_DISCONNECTED;
    this._proxy_server = proxy_server;
    this._proxy_port = proxy_port;
    this._proxy_pass = proxy_pass;
    this._server = null;
    this._port = null;
    this._io = null;
    this._buffer = '';
}
TCPClientSocketIO.prototype = new TCPClient();
TCPClientSocketIO.prototype.constructor = TCPClientSocketIO;

// Proxy state definition.
TCPClientSocketIO._PROXY_DISCONNECTED = 0;
TCPClientSocketIO._PROXY_OPENING = 1;
TCPClientSocketIO._PROXY_HANDSHAKE = 2;
TCPClientSocketIO._PROXY_CONNECTING = 2;
TCPClientSocketIO._PROXY_OPEN = 3;

/**
 * Socket.IO event handler for established connection.
 * @private
 */
TCPClientSocketIO.prototype._io_connect = function () {
    // Workaround to avoid second fallback connection after immediate closure.
    if (this._proxy_status != TCPClientSocketIO._PROXY_OPENING)
        return;

    console.info('proxy connection established');
    this._proxy_status = TCPClientSocketIO._PROXY_HANDSHAKE;
};

/**
 * Socket.IO event handle for receiving data.
 * @param data {string} receiving data.
 * @private
 */
TCPClientSocketIO.prototype._io_message = function (data) {
    // Workaround to avoid second fallback connection after immediate closure.
    if (this._proxy_status == TCPClientSocketIO._PROXY_DISCONNECTED)
        return;

    // Call TCPClient receiving event handler.
    if (this._proxy_status == TCPClientSocketIO._PROXY_OPEN)
        return this.onreceive(data);

    // Handle receiving data as handshake transaction.
    var lines = (this._buffer + data).split('\n');
    var lastLine = lines.length - 1;
    this._buffer = lines[lastLine];
    for (var i = 0; i < lastLine; i++) {
        if (this._proxy_status == TCPClientSocketIO._PROXY_OPEN)
            break;
        if (lines[i].charAt(lines[i].length - 1) == '\r')
            lines[i] = lines[i].slice(0, lines[i].length - 1);
        this._proxy_handshake(lines[i]);
    }

    // Call TCPClient receiving event handler for rest data.
    for (; i < lastLine; i++)
        this.onreceive(lines[i] + '\n');
    if (this._buffer) {
        this.onreceive(this._buffer);
        this._buffer = '';
    }
};

/**
 * Socket.IO event handler for disconnection.
 * @private
 */
TCPClientSocketIO.prototype._io_disconnect = function () {
    console.info('proxy disconnected');
    this.status = TCPClient.DISCONNECTED;
    this._proxy_status = TCPClientSocketIO._PROXY_DISCONNECTED;
    this.ondisconnect();
};

/**
 * Handle proxy handshake. See alto server/app.js.
 * @param line {string} one line handshake data.
 * @private
 */
TCPClientSocketIO.prototype._proxy_handshake = function (line) {
    var cmd = line.split(' ')[0];
    if ((this._proxy_status == TCPClientSocketIO._PROXY_HANDSHAKE) &&
            (cmd == 'HELLO')) {
        // 'HELLO [message] (<nonce>)'
        console.info('proxy connected: ' + line);
        var nonce = line.match(/\(([^)]+)\)/i)[1];
        console.info('proxy nonce: ' + nonce);
        var digest = null;
        if (this._proxy_pass) {
            // Send 'DIGEST <md5(<nonce>:<password>)>' before 'CONNECT'.
            // Will receive 'DISCONNECTED [message]' if the value wrong.
            digest = MD5.createDigestString(nonce + ':' + this._proxy_pass);
            console.log('proxy digest: ' + digest);
            this._io.send('DIGEST ' + digest + '\n');
        }
        // Send 'CONNECT <server> <port>'.
        this._proxy_status = TCPClientSocketIO._PROXY_CONNECTING;
        console.info('proxy connecting ' + this._server + ':' + this._port);
        this._io.send('CONNECT ' + this._server + ' ' + this._port + '\n');
        return;
    }
    if (this._proxy_status == TCPClientSocketIO._PROXY_CONNECTING) {
        if (cmd == 'DISCONNECTED') {
            // Maybe digest was wrong, or IRC server rejected.
            console.info('proxy reject connection: ' + line);
            this.disconnect();
        } else if (cmd == 'CONNECTED') {
            // Pass proxy authorization and IRC server connection.
            var hostport = this._server + ':' + this._port;
            console.info('proxy connected to ' + hostport);
            this.status = TCPClient.OPEN;
            this._proxy_status = TCPClientSocketIO._PROXY_OPEN;
            this.onconnect();
        }
        return;
    }
    console.info('unknown proxy response: ' + line);
    this.disconnect();
};

/**
 * Connect to a server.
 * @param {string} server server address.
 * @param {number} port server port.
 */
TCPClientSocketIO.prototype.connect = function (server, port) {
    this._server = server;
    this._port = port;

    // Create Socket.IO channel to the proxy server.
    this._io = new io.Socket(this._proxy_server, { port: this._proxy_port });

    // Register handlers.
    this._io.on('connect', this._io_connect.bind(this));
    this._io.on('message', this._io_message.bind(this));
    this._io.on('disconnect', this._io_disconnect.bind(this));

    // Start to establish connection to the proxy.
    // TODO: If the server is not reachable, no event handler is invoked.
    // Maybe we should handle timeout and check the status to invoke a handler
    // manually.
    this.status = TCPClient.CONNECTING;
    this._proxy_status = TCPClientSocketIO._PROXY_OPENING;
    console.info('connecting to proxy (' + this._proxy_server + ':' +
            this._proxy_port + ')');
    this._io.connect();
};

/**
 * Disconnect from the server.
 */
TCPClient.prototype.disconnect = function () {
    this._io.disconnect();
    this._io = null;
};

/**
 * Send text data to the server.
 * @param data {string} data to send.
 */
TCPClient.prototype.send = function (data) {
    this._io.send(data);
};
