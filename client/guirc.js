/**
 * Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
/**
 * GUI integration. GuIRC extends IRC to handle IRC protocol, and uses gui.js
 * functions to integrate IRC to GUI.
 * TODO: Move localStorage related codes to gui.js.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 * @constructor
 * @extends {IRC}
 */
function GuIRC () {
    this._logging = true;  // @type {boolean} Enable logging.
    this.channels = {};  // @type {Hash.{string, Array.<boolean, string>}}
                         // Joined channel list.
                         //     topic @type {string} Channel topic.
                         //     nicks @type {Array.<boolean, string>} Users.
                         //         op @type {boolean} Operator permission.
                         //         nick @type {string} User nick.
    this.nick = localStorage.nick;  // @type {string} Nick.
    this.keywords = [];  // @type {Array.<string>} Keyword list.
    if (localStorage.keywords)
        this.keywords = localStorage.keywords.split(',');
    IRC.apply(this, [localStorage.proxyHost, localStorage.proxyPort,
            localStorage.proxyPassword, localStorage.serverHost,
            localStorage.serverPort, localStorage.serverPassword, this.nick]);
}
GuIRC.prototype = new IRC();
GuIRC.prototype.constructor = GuIRC;

/**
 * Adds a new user to the user list of the specified channel.
 * @param channel {string} A target channel to modify user list.
 * @param nick {string} A nick to be added.
 * @return {number} An index of |channel|.
 * @private
 */
GuIRC.prototype._addUser = function (channel, nick) {
    this.channels[channel].nicks.push({ op: false, nick: nick });
    // TODO: sortUsers() must be a member function of GuIRC.
    sortUsers(channel);
    // If the updating channel is the one on the active tab, we should update
    // user list UI.
    var index = channelIndex(channel);
    if (index == activeTab)
        updateUsers();
    return index;
};

/**
 * Removes a user from the user list of the specified channel.
 * @param {string} channel A target channel to modify user list.
 * @param {string} nick A nick to be removed.
 * @return {Object.<boolean, string>} Removed user information if the user is
 *                                    in the list. Otherwise, null.
 *      op @type {boolean} Channel operator permission.
 *      nick @type {string} User nick.
 * @private
 */
GuIRC.prototype._removeUser = function (channel, nick) {
    var list = this.channels[channel].nicks;
    for (var i = 0; i < list.length; i++) {
        if (list[i].nick == nick) {
            var result = list.splice(i,1);
            var index = channelIndex(channel);
            if (index == activeTab)
                updateUsers();
            return result;
        }
    }
    return null;
};

/**
 * Handles a JOIN message.
 * @see IRC.prototype.handleJoin.
 */
GuIRC.prototype.handleJoin = function (nicks, channel) {
    if (this.nick == nicks.nick) {
        // User joins to new channel.
        // |this.channels| is synced with GUI channel tabs. The channel where
        // user joined and left, but doesn't close its tab will be in the list.
        var newChannel = !this.channels[channel];
        this.channels[channel] = {
            topic: ' ',
            nicks: []
        };
        // If joining channel is not in the channel tab, add it as empty.
        // The topic and user list will be updated by handleTopic() and
        // handleName() following handleJoin().
        if (newChannel)
            appendChannel(channel);
    } else {
        // Another user joins to the channel where user joined.
        if (!this.channels[channel]) {
            // Usually, the client must receive information only on channels
            // where the user already joined. So this case could not happen.
            console.error('invalid join message to unknown channel');
            return;
        }
        // Add new user to channel user list.
        var index = this._addUser(channel, nicks.nick);
        // Then, show a joining message.
        // TODO: We should have a setting to emit following message.
        appendChannelMessage(index, '* ' + nicks.nick + 'が入室しました');
    }
};

/**
 * Handles a NICK message.
 * @see IRC.prototype.handleNick.
 */
GuIRC.prototype.handleNick = function (nicks, nick) {
    // Firstly, remove all old user information which has old nick.
    for (var channel in this.channels) {
        var target = this._removeUser(channel, nicks.nick);
        if (target) {
            // If the channel had the old nick, change it to new nick, then add
            // it to the channel again.
            target.nick = nick;
            var index = this._addUser(channel, nick);
            // TODO: Emit multicast to common log view.
            appendChannelMessage(index, '* ' + nicks.nick + 'がNICKを' + nick +
                    'に変更しました');
        }
    }
};

/**
 * Handles a PART message,
 * @see IRC.prototype.handlePart.
 */
GuIRC.prototype.handlePart = function (nicks, channel, message) {
    if (this._removeUser(channel, nicks.nick)) {
        var index = channelIndex(channel);
        appendChannelMessage(index, '* ' + nicks.nick + 'が退室しました ' + '(' +
            message + ')');
        // TODO: [optional] Remove channel tab.
    }
};

/**
 * Handles a PRIVMSG message.
 * @see IRC.prototype.handlePrivateMessage.
 * TODO: Ignore a message from the server, or just show it in the server tab.
 */
GuIRC.prototype.handlePrivateMessage = function (nicks, target, message) {
    // TODO: Make message more colorful.
    var index = channelIndex(target);
    if (index > 0) {
        // |target| is a channel having a corresponding tab.
        appendChannelMessage(index, nicks.nick + ' ' + message);
    } else {
        if (target != this.nick) {
            // This client must not receive this kinds of messages.
            console.error('private message to unknown target');
            return;
        }
        // Check if we already have private message tab for the nick.
        index = channelIndex(nicks.nick);
        if (index < 0) {
            // Open private message tab with sender nick.
            this.channels[nicks.nick] = {
                topic: nicks.nick + 'からのプライベートメッセージ',
                nicks: [
                    { op: false, nick: nicks.nick },
                    { op: false, nick: this.nick }
                ]
            };
            index = appendChannel(nicks.nick);
        }
        appendChannelMessage(index, nicks.nick + ' ' + message);
        // TODO: Have a config to omit following behavior?
        activateTab(index);
    }
    // Check keyword list to show notification dialog.
    var match = false;
    for (var i = 0; i < this.keywords.length; i++)
        if (message.search(this.keywords[i]) >= 0)
            match = true;
    if (match)
        showNotification(nicks.nick + ' <' + target + '>', message);
};

/**
 * Handles a QUIT message.
 * @see IRC.prototype.handleQuit.
 */
GuIRC.prototype.handleQuit = function (nicks, message) {
    for (var channel in this.channels) {
        var target = this._removeUser(channel, nicks.nick);
        if (target) {
            var index = channelIndex(channel);
            appendChannelMessage(index, '* ' +
                nicks.nick + 'がログアウトしました (' + message + ')');
        }
    }
};

/**
 * Handles a TOPIC message.
 * @see IRC.prototype.handleTopic.
 */
GuIRC.prototype.handleTopic = function (nicks, channel, topic) {
    var index = channelIndex(channel);
    if (nicks) {
        appendChannelMessage(index, '* ' + nicks.nick + 'がトピックを「' +
            topic + '」に変更しました')
    }
    this.channels[channel].topic = topic;
    if (activeTab == index)
        setTopic(topic);
};

/**
 * Handles a user list update event.
 * @see IRC.prototype.handleName.
 */
GuIRC.prototype.handleName = function (channel, nicks) {
    this.channels[channel].nicks = nicks;
    sortUsers(channel);
    var index = channelIndex(channel);
    if (activeTab == index)
        updateUsers();
};

/**
 * Handles other messages.
 * @see IRC.prototype.handleMisc.
 */
GuIRC.prototype.handleMisc = function (prefix, command, args) {
    // Show other messages in the server message tab.
    var message = prefix.prefix + ' ' + command + ' ' + args;
    appendChannelMessage(0, message);
};
