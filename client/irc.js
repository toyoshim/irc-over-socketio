/**
 * Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
/**
 * IRC client.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 * @param {string} proxy_server Proxy server host name.
 * @param {number} proxy_port Proxy server port number.
 * @param {string} proxy_pass Proxy server password [optional].
 * @param {string} server IRC server host name.
 * @param {number} port IRC server port number.
 * @param {string} pass IRC server password [optional].
 * @param {string} nick IRC nick name to use.
 * @constructor
 */
function IRC (proxy_server, proxy_port, proxy_pass, server, port, pass, nick) {
    this._proxy_server = proxy_server;
    this._proxy_port = proxy_port;
    this._proxy_pass = proxy_pass;
    this._server = server;
    this._port = port;
    this._pass = pass;
    this._nick = nick;
    this._names = [];
    this._channel = '';  // Current channel (used in _name(), and _nameEnd())
    this._joined = {};
    this._socket = null;
    this._buffer = '';
}

/**
 * Connect to a server.
 */
IRC.prototype.connect = function () {
    // Create abstract TCP channel.
    this._socket = TCPClient.createTCPClient({
        type: TCPClient.TYPE_SOCKETIO,
        proxy_server: this._proxy_server,
        proxy_port: this._proxy_port,
        proxy_pass: this._proxy_pass
    });

    // Register handlers.
    this._socket.onconnect = this._onconnect.bind(this);
    this._socket.onreceive = this._onreceive.bind(this);
    this._socket.ondisconnect = this._ondisconnect.bind(this);

    // Connect.
    console.info('connecting to a server');
    this._socket.connect(this._server, this._port);
};

/**
 * Handle onconnect event from a socket.
 * @private
 */
IRC.prototype._onconnect = function () {
    // Initialize connection dependent variables.
    this._names = [];
    this._channel = '';
    this._joined = {};
    this._buffer = '';
    if (this._pass)
        this.send('PASS ' + this._pass);
    this.send('NICK ' + this._nick);
    this.send([
        'USER', this._nick, 'localhost', this._server, 'IRC over Socket.IO'
    ].join(' '));
};

/**
 * Handles onreceive event from a socket. Split received data into messages
 * line by line.
 * @param data {string} received data
 * @private
 */
IRC.prototype._onreceive = function (data) {
    var lines = (this._buffer + data).split('\n');
    var lastLine = lines.length - 1;
    this._buffer = lines[lastLine];
    for (var i = 0; i < lastLine; i++) {
        if (lines[i].charAt(lines[i].length - 1) == '\r')
            lines[i] = lines[i].slice(0, lines[i].length - 1);
        try {
            this._receiveMessage(lines[i]);
        } catch (e) {
            console.error(e);
            console.error(lines[i]);
        }
    }
};

/**
 * Handle ondisconnect event from a socket.
 * @private
 */
IRC.prototype._ondisconnect = function () {
    console.info('disconnected ... try to reconnect after 5 sec');
    this._socket = null;
    setTimeout(this.connect.bind(this), 5000);
};

/**
 * Disconnects the established connection to the proxy server.
 */
IRC.prototype.disconnect = function () {
    this._socket.disconnect();
};

/**
 * Parses <prefix> defined in RFC1459.
 * @param {string} prefix Prefix.
 * @return {Object.<string, string, string, string>}
 *      nick @type {string} <servername> | <nick> part of <prefix>.
 *      user @type {string} <user> part of <prefix>.
 *      host @type {string} <host> part of <prefix>.
 *      prefix @type {string} Original <prefix> string.
 * @private
 */
IRC.prototype._parsePrefix = function (prefix) {
    var nick = '';
    var user = '';  // optional, could be ''.
    var host = '';  // optional, could be ''.
    // prefix ::= <servername> | <nick> [ '!' <user> ] [ '@' <host> ]
    if (prefix) {
        var nickArray = prefix.split('!');
        if (nickArray.length == 1) {
            nickArray = prefix.split('@');
            nick = nickArray[0];
            if (nickArray.length != 1)
                host = nickArray[1];
        } else {
            nick = nickArray[0];
            nickArray = nickArray[1].split('@');
            user = nickArray[0];
            if (nickArray.length != 1)
                host = nickArray[1];
        }
        nick = nick.slice(1);
    }
    return { nick: nick, user: user, host: host, prefix: prefix };
};

/**
 * Parse a message line.
 * @param {string} message A single receiving message line.
 * @private
 */
IRC.prototype._receiveMessage = function (message) {
    // <message> ::= [':' <prefix> <SPACE> ] <command> <params> <crlf>
    // <command> ::= <letter> { <letter> } | <number> <number> <number>
    var prefix = null;
    var array = message.split(' ');
    if (':' == array[0].charAt(0))
        prefix = this._parsePrefix(array.shift());
    var args = [];
    // <command> ( <SPACE> <params> )* [ <SPACE> ':' <trailing> ] <crlf>
    // trailing might include some <SPACE>s.
    while (0 != array.length) {
        if (array[0].charAt(0) == ':') {
            // ':' <trailing>
            array[0] = array[0].slice(1);
            args.push(array.join(' '));
            break;
        }
        args.push(array.shift());
    }
    var command = args[0];
    if (command == 'JOIN') {
        this.handleJoin(prefix, args[1]);
    } else if (command == 'NICK') {
        this.handleNick(prefix, args[1]);
    } else if (command == 'PART') {
        if (!args[2])
            args[2] = '';
        this.handlePart(prefix, args[1], args[2]);
    } else if (command == 'PING') {
        console.info('PING / PONG ' + args[1]);
        this.send('PONG ' + args[1]);
    } else if (command == 'PRIVMSG') {
        this.handlePrivateMessage(prefix, args[1], args[2]);
    } else if (command == 'QUIT') {
        if (!args[1])
            args[1] = '';
        this.handleQuit(prefix, args[1]);
    } else if (command == 'TOPIC') {
        this.handleTopic(prefix, args[1], args[2]);
    } else if (command == '332') {
        // 332 RPL_TOPIC
        this.handleTopic(null, args[2], args[3]);
    } else if (command == '333') {
        // Ignore: channel creator information?
    } else if (command == '353') {
        // 353 RPL_NAMREPLY
        this._name(args[1], args[2], args[3], args[4]);
    } else if (command == '366') {
        // 366 RPL_ENDOFNAME
        this._nameEnd(args[1], args[2]);
    } else {
        args.shift();
        this.handleMisc(prefix, command, args.join(' '));
    }
};

/**
 * Handles 353.
 * @param {string} nick Nick.
 * @param {string} mode Channel mode.
 * @param {string} channel Channel name.
 * @param {string} users User list joined with ' '.
 * @private
 */
IRC.prototype._name = function (nick, mode, channel, users) {
    if (nick != this._nick) {
        console.error('IRC: command 353 does not start with your nick');
        return;
    }
    if ((mode != '@') && (mode != '+') && (mode != '=')) {
        console.error('IRC: command 353 has an unknown second parameter ' +
                mode);
        return;
    }
    if (channel != this._channel) {
        if (this._names.length != 0) {
            this.handleName(this._channel, this._names);
            this._names = [];
        }
        this._channel = channel;
    }
    var userArray = users.split(' ');
    for (var i = 0; i < userArray.length; i++) {
        var op = false;
        if (userArray[i].charAt(0) == '@') {
            op = true;
            userArray[i] = userArray[i].slice(1);
        }
        this._names.push({ op: op, nick: userArray[i] });
    }
};

/**
 * Handles 366.
 * @param {string} nick Nick.
 * @param {string} channel Channel name.
 * @private
 */
IRC.prototype._nameEnd = function (nick, channel) {
    if (nick != this._nick) {
        console.error('IRC: command 366 does not start with your nick');
        return;
    }
    if (channel != this._channel) {
        console.error('IRC: channel name is inconsistent between command ' +
                '353 and 366');
        return;
    }
    this.handleName(this._channel, this._names);
    this._names = [];
};

/**
 * Send a message to the server.
 * @param {string} message A RFC1459 message line excluding tailing <crlf>.
 */
IRC.prototype.send = function (message) {
    this._socket.send(message + '\r\n');
};

/**
 * Send a private message to a server or a user.
 * @param {string} target A server or a user.
 * @param {string} message A message which send to |target|.
 */
IRC.prototype.sendMessage = function (target, message) {
    this.send('PRIVMSG ' + target + ' :' + message);
};

//-----------------------------------------------------------------------------
// Following methods works like virtual functions. You can replace following
// methods to handle IRC protocol events.
//-----------------------------------------------------------------------------

/**
 * Handles a JOIN message. If nick is this client's nick, it means this client
 * joins to a new channel. Otherwise, another user joins a channel this client
 * joined.
 * @param {Object.<string, string, string, string>} nicks
 *      nick @type {string} <servername> | <nick> part of <prefix>.
 *      user @type {string} <user> part of <prefix>.
 *      host @type {string} <host> part of <prefix>.
 *      prefix @type {string} Original <prefix> string.
 * @param {string} channel A channel to join.
 */
IRC.prototype.handleJoin = function (nicks, channel) {
    this.log(nicks.nick + ' join to ' + channel);
    this.log(nicks);
    if (nicks.nick == this._nick)
        this._joined[channel] = { topic: '', nicks: [] };
    else
        this._joined[channel].nicks.push({ op: false, nick: nicks.nick });
};

/**
 * Handles a NICK message. This means the user |nicks| represents changes its
 * nick to |nick|.
 * @param {Object.<string, string, string, string> nicks
 *      nick @type {string} <servername> | <nick> part of <prefix>.
 *      user @type {string} <user> part of <prefix>.
 *      host @type {string} <host> part of <prefix>.
 *      prefix @type {string} Original <prefix> string.
 * @param {string} nick New nick.
 */
IRC.prototype.handleNick = function (nicks, nick) {
    // TODO: update channel nicks.
    if (this.nick == nicks.nick)
        this.nick = nick;
    this.log(nicks.nick + ' changes nick to ' + nick);
};

/**
 * Handles a PART message.
 * @param {Object.<string, string, string, string> nicks
 *      nick @type {string} <servername> | <nick> part of <prefix>.
 *      user @type {string} <user> part of <prefix>.
 *      host @type {string} <host> part of <prefix>.
 *      prefix @type {string} Original <prefix> string.
 * @param {string} channel A channel |nicks| is going to leave.
 * @param {string} message A message.
 */
IRC.prototype.handlePart = function (nicks, channel, message) {
    // TODO: update channel nicks
    this.log(nicks.nick + ' leave channel ' + channel + ' (' + message + ')');
};

/**
 * Handles a PRIVMSG message. This message means that |nicks| send |message| to
 * |target|.
 * @param {Object.<string, string, string, string> nicks
 *      nick @type {string} <servername> | <nick> part of <prefix>.
 *      user @type {string} <user> part of <prefix>.
 *      host @type {string} <host> part of <prefix>.
 *      prefix @type {string} Original <prefix> string.
 * @param {string} target A channel or a nick.
 * @param {string] message A message.
 */
IRC.prototype.handlePrivateMessage = function (nicks, target, message) {
    this.log(nicks.nick + ' > ' + message + ' (' + target + ')');
};

/**
 * Handles a QUIT message. This means |nicks| quits IRC.
 * @param {Object.<string, string, string, string> nicks
 *      nick @type {string} <servername> | <nick> part of <prefix>.
 *      user @type {string} <user> part of <prefix>.
 *      host @type {string} <host> part of <prefix>.
 *      prefix @type {string} Original <prefix> string.
 * @param {string} message A message.
 */
IRC.prototype.handleQuit = function (nicks, message) {
    this.log(nicks.nick + 'quit (' + message + ')');
};

/**
 * Handles a TOPIC message. This means that |nicks| changes |channel|'s topic
 * to |topic|.
 * @param {Object.<string, string, string, string> nicks
 *      nick @type {string} <servername> | <nick> part of <prefix>.
 *      user @type {string} <user> part of <prefix>.
 *      host @type {string} <host> part of <prefix>.
 *      prefix @type {string} Original <prefix> string.
 * @param {string} channel A channel.
 * @param {string} topic New channel topic.
 */
IRC.prototype.handleTopic = function (nicks, channel, topic) {
    if (nicks)
        this.log(nicks.nick + ' set topic of ' + channel + ' to ' + topic);
    else
        this.log('topic of ' + channel + ' is ' + topic);
    this._joined[channel].topic = topic;
};

/**
 * Handles a user list update event. This event will happens after the client
 * joins to a new channel.
 * @param {string} channel A channel.
 * @param {Array.<boolean, string>} nicks
 *      op @type {boolean} Channel operator permission.
 *      nick @type {string} Nick
 */
IRC.prototype.handleName = function (channel, nicks) {
    this.log('nick list of ' + channel);
    this.log(nicks);
    this._joined[channel].nicks = nicks;
};

/**
 * Handles other messages.
 * @param {Object.<string, string, string, string> prefix
 *      nick @type {string} <servername> | <nick> part of <prefix>.
 *      user @type {string} <user> part of <prefix>.
 *      host @type {string} <host> part of <prefix>.
 *      prefix @type {string} Original <prefix> string.
 * @param {string} command A command.
 * @param {Array.<string>} args Arguments.
 */
IRC.prototype.handleMisc = function (prefix, command, args) {
    console.warn(prefix.prefix + ' ' + command + ' ' + args);
};

/**
 * Log messages from command handlers.
 * @param {string} msg A message.
 */
IRC.prototype.log = function (msg) {
    console.info(msg);
};
