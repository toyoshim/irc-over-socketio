/**
 * Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
/**
 * TCP client over WebSocket.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 * @constructor
 */
function TCPClientWebSocket (proxy_server, proxy_port, proxy_pass) {
    this._proxy_server = proxy_server;
    this._proxy_port = proxy_port;
    this._proxy_pass = proxy_pass;
    this._server = null;
    this._port = null;
    this._ws = null;
    this._buffer = '';
}
TCPClientWebSocket.prototype = new TCPClient();
TCPClientWebSocket.prototype.constructor = TCPClientWebSocket;

// Proxy state definition.
// TODO: Move common code between TCPClientSocketIO and TCPClientWebSocket to
// TCPClient.
TCPClientWebSocket._PROXY_DISCONNECTED = 0;
TCPClientWebSocket._PROXY_OPENING = 1;
TCPClientWebSocket._PROXY_HANDSHAKE = 2;
TCPClientWebSocket._PROXY_CONNECTING = 2;
TCPClientWebSocket._PROXY_OPEN = 3;

/**
 * WebSocket event handler for established connection.
 * @private
 */
TCPClientWebSocket.prototype._onopen = function () {
    // Workaround to avoid second fallback connection after immediate closure.
    if (this._proxy_status != TCPClientWebSocket._PROXY_OPENING)
        return;

    console.info('proxy connection established');
    this._proxy_status = TCPClientWebSocket._PROXY_HANDSHAKE;
};

/**
 * WebSocket event handle for receiving data.
 * @param data {string} receiving data.
 * @private
 */
TCPClientWebSocket.prototype._onmessage = function (event) {
    // Workaround to avoid second fallback connection after immediate closure.
    if (this._proxy_status == TCPClientWebSocket._PROXY_DISCONNECTED)
        return;

    // Call TCPClient receiving event handler.
    if (this._proxy_status == TCPClientWebSocket._PROXY_OPEN)
        return this.onreceive(event.data);

    // Handle receiving data as handshake transaction.
    var lines = (this._buffer + event.data).split('\n');
    var lastLine = lines.length - 1;
    this._buffer = lines[lastLine];
    for (var i = 0; i < lastLine; i++) {
        if (this._proxy_status == TCPClientWebSocket._PROXY_OPEN)
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

TCPClientWebSocket.prototype._onclose = function () {
    console.log("onclose");
};

/**
 * Handle proxy handshake. See alto server/app.js.
 * @param line {string} one line handshake data.
 * @private
 */
TCPClientWebSocket.prototype._proxy_handshake = function (line) {
    var cmd = line.split(' ')[0];
    if ((this._proxy_status == TCPClientWebSocket._PROXY_HANDSHAKE) &&
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
            this._ws.send('DIGEST ' + digest + '\n');
        }
        // Send 'CONNECT <server> <port>'.
        this._proxy_status = TCPClientWebSocket._PROXY_CONNECTING;
        console.info('proxy connecting ' + this._server + ':' + this._port);
        this._ws.send('CONNECT ' + this._server + ' ' + this._port + '\n');
        return;
    }
    if (this._proxy_status == TCPClientWebSocket._PROXY_CONNECTING) {
        if (cmd == 'DISCONNECTED') {
            // Maybe digest was wrong, or IRC server rejected.
            console.info('proxy reject connection: ' + line);
            this.disconnect();
        } else if (cmd == 'CONNECTED') {
            // Pass proxy authorization and IRC server connection.
            var hostport = this._server + ':' + this._port;
            console.info('proxy connected to ' + hostport);
            this.status = TCPClient.OPEN;
            this._proxy_status = TCPClientWebSocket._PROXY_OPEN;
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
TCPClientWebSocket.prototype.connect = function (server, port) {
    this._server = server;
    this._port = port;

    // Create Socket.IO channel to the proxy server.
    this._ws = new WebSocket('ws://' + this._proxy_server + ':' +
            this._proxy_port + '/');

    // Register handlers.
    this._ws.onopen = this._onopen.bind(this);
    this._ws.onmessage = this._onmessage.bind(this);
    this._ws.onclose = this._onclose.bind(this);

    // Start to establish connection to the proxy.
    this.status = TCPClient.CONNECTING;
    this._proxy_status = TCPClientWebSocket._PROXY_OPENING;
    console.info('connecting to proxy (' + this._proxy_server + ':' +
        this._proxy_port + ')');
};

/**
 * Disconnect from the server.
 */
TCPClientWebSocket.prototype.disconnect = function () {
    //this._ws.close();
};

/**
 * Send text data to the server.
 * @param data {string} data to send.
 */
TCPClientWebSocket.prototype.send = function (data) {
    this._ws.send(data);
};
