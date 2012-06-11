/**
 * Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
/**
 * TCP client by chrome.socket.
 * TODO: work in progress.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 * @constructor
 */
function TCPClientChromeSocket () {
    // TODO: Add DNS server configuration.
    this._dns = new DNS();
    this._server = null;
    this._port = null;
    this._socket = chrome.socket || chrome.experimental.socket;
}
TCPClientChromeSocket.prototype = new TCPClient();
TCPClientChromeSocket.prototype.constructor = TCPClientChromeSocket;

/**
 * Connect to a server.
 * @param {string} server server address.
 * @param {number} port server port.
 */
TCPClientChromeSocket.prototype.connect = function (server, port) {
    this._server = server;
    this._port = Number(port);
    console.info('Resolving address for ' + server);
    this._dns.resolveA(server, this._resolved.bind(this));
};

TCPClientChromeSocket.prototype._resolved = function (addresses) {
    console.info('Apply IP address ' + addresses[0]);
    this._socket.create("tcp", {}, function (socketInfo) {
        this._socketId = socketInfo.socketId;
        if (this._socketId <= 0) {
            console.info('create socket fail');
            this.ondisconnect();
            return;
        }
        this._socket.connect(this._socketId, addresses[0], this._port,
                this._connected.bind(this));
    }.bind(this));
};

TCPClientChromeSocket.prototype._connected = function (result) {
    if (result != 0) {
        this.ondisconnect();
    } else {
        this.onconnect();
        this._socket.read(this._socketId, this._read.bind(this));
    }
};

TCPClientChromeSocket.prototype._read = function (readInfo) {
    if (readInfo.resultCode <= 0)
        return this.disconnect();

    var array = [];
    var length = readInfo.data.byteLength;
    // TODO: Network might split a surrogate pair to fragmented frames.
    this.onreceive(Unicode.createStringFromUTF8ArrayBuffer(readInfo.data));
    this._socket.read(this._socketId, this._read.bind(this));
};

/**
 * Disconnect from the server.
 */
TCPClientChromeSocket.prototype.disconnect = function () {
    this._socket.disconnect(this._socketId);
};

/**
 * Send text data to the server.
 * @param data {string} data to send.
 */
TCPClientChromeSocket.prototype.send = function (data) {
    this._socket.write(this._socketId,
            Unicode.createUTF8ArrayBufferFromString(data),
            this._sent.bind(this));
};

TCPClientChromeSocket.prototype._sent = function (writeInfo) {
    // TODO: Implement queue as ongoing send operation is at most one.
};