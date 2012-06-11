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
function TCPClient () {
    this.status = TCPClient.DISCONNECTED;
}

// TCP client network status.
TCPClient.DISCONNECTED = 0;
TCPClient.CONNECTING = 1;
TCPClient.OPEN = 2;

// TCPClientOptions.type.
TCPClient.TYPE_SOCKETIO = 0;
TCPClient.TYPE_WEBSOCKET = 1;
TCPClient.TYPE_CHROMESOCKET = 2;

/**
 * Create TCPClient object.
 * @param options {TCPClientOptions} options.
 *         type {number} TCPClient.TYPE_SOCKETIO or
 *                 TCPClient.TYPE_CHROMESOCKET.
 *         proxy_server {string} Socket.IO to TCP proxy server address.
 *         proxy_port {number} Socket.IO to TCP proxy server port.
 *         proxy_pass {string} Socket.IO to TCP proxy server password.
 */
TCPClient.createTCPClient = function (options) {
    if (options.type == TCPClient.TYPE_SOCKETIO)
        return new TCPClientSocketIO(
                options.proxy_server, options.proxy_port, options.proxy_pass);
    if (options.type == TCPClient.TYPE_CHROMESOCKET)
        return new TCPClientChromeSocket();
    return null;
};

/**
 * Connect to a server.
 * @param {string} server server address.
 * @param {number} port server port.
 */
TCPClient.prototype.connect = function (server, port) {
};

/**
 * Disconnect from the server.
 */
TCPClient.prototype.disconnect = function () {
};

/**
 * Send text data to the server.
 * @param data {string} data to send.
 */
TCPClient.prototype.send = function (data) {
};

/**
 * Event handler to detect connection establishment. Owner can overwrite this
 * function to detect the connection establishment.
 */
TCPClient.prototype.onconnect = function () {
};

/**
 * Event handler to receive a data from the server. Owner can overwrite this
 * function to receive data.
 * @param data {string} receiving data.
 */
TCPClient.prototype.onreceive = function (data) {
};

/**
 * Event handler to detect closed connection. Owner can overwrite this function
 * to detect the closure.
 */
TCPClient.prototype.ondisconnect = function () {
};