/**
 * Copyright (c) 2012, 2013, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
/**
 * IRC over Socket.IO GUI functions.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
var irc = null;  // @type {GuIRC} irc Protocol handling object
var activePage = 2;  // @type {number} activePage Current showing page
var activeTab = 0;  // @type {number} activeTab Current tab in the chat page
var tabs = 1;  // @type {number} tabs The number of tabs in the chat page

/**
 * Creates and shows notification dialog.
 * @param title {string} Notification title.
 * @param message {string} Notification message.
 */
var showNotification = function (title, message) {
    var notification = window.webkitNotifications.createNotification(
        'icon.png', title, message);
    notification.show();
};

/**
 * Shows the specified page and hides other pages.
 * @param index {number} A page index.
 *      0: IRC over Socket.IO license information.
 *      1: Main page.
 *      2: Setting page.
 */
var activatePage = function (index) {
    if (!window.ios.settings.valid)
        return;
    var menu = $('#main-menu>li');
    var page = $('body>div');
    if (activePage >= 1)
        menu[activePage - 1].className = '';
    page.eq(activePage + 1).css('display', 'none');
    activePage = index;
    if (activePage >= 1)
        menu[activePage - 1].className = 'active';
    page.eq(activePage + 1).css('display', 'block');
    if (activePage == 1 && !irc) {
        irc = new GuIRC();
        irc.connect();
    }
};

/**
 * Show the specified tab in the main page and hides other tabs.
 * @param index {number} A tab index.
 *      0: Server tab.
 */
var activateTab = function (index) {
    var tab = $('#chat-tab>li');
    var list = $('#channels>div');
    tab[activeTab].className = '';
    list.eq(activeTab).css('display', 'none');
    activeTab = index;
    tab[activeTab].className = 'active';
    list.eq(activeTab).css('display', 'block');
    var dom = list.eq(activeTab).get(0);
    dom.scrollTop = dom.scrollHeight;
    if (irc && (0 != activeTab)) {
        var name = tab[activeTab].getAttribute('name');
        setTopic(irc.channels[name].topic);
    } else {
        setTopic('');
    }
    updateUsers();
};

/**
 * Gets active tab name.
 * @return {string} The active tab name or empty string for the server tab.
 */
var getActiveTabName = function () {
    // The server tab (index 0) has no name, then return ''.
    var tab = $('#chat-tab>li');
    return tab[activeTab].getAttribute('name');
};

/**
 * Gets a string representing current time in format 'HH:MM'.
 * @return {string} A string representing current time.
 */
var getTimeString = function () {
    var date = new Date();
    var hour = ('0' + date.getHours()).slice(-2);  // %02d, hour
    var minute = ('0' + date.getMinutes()).slice(-2);  // %02d, minute
    return hour + ':' + minute;
};

/**
 * Appends a message to the |channel|'s tab.
 * @param index {number} A channel index.
 * @param message {string} A message to append.
 */
var appendChannelMessage = function (index, message) {
    // Escape tag start and end characters.
    var escapedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Append to the channel tab.
    var channel = $('#channels>div').eq(index);
    var time = getTimeString();
    channel.append(time + ' ' + escapedMessage + '<br>');
    // Auto scroll.
    // TODO: Omit if the scroll position is not bottom.
    var dom = channel.get(0);
    dom.scrollTop = dom.scrollHeight;

    // Append to the common log view.
    var tab = $('#chat-tab>li');
    var name = tab[index].getAttribute('name');
    var log = $('#log');
    var time = getTimeString();
    log.append(time + ' <' + name + '>' + escapedMessage + '<br>');
    // Auto scroll.
    var dom = log.get(0);
    dom.scrollTop = dom.scrollHeight;
};

/**
 * Gets a tab index of a channel.
 * @param channel {string} Channel name to be checked.
 * @return {number} A index of the |channel| if found, otherwise -1.
 */
var channelIndex = function (channel) {
    var tab = $('#chat-tab>li');
    for (var i = 0; i < tab.size(); i++)
        if (tab.get(i).getAttribute('name') == channel)
            return i;
    return -1;
};

/**
 * Appends new channel tab.
 * @param channel {string} Channel name.
 * @return {number} A channel tab index.
 */
var appendChannel = function (channel) {
    // TODO: Handle remove icon.
    var tab = $('#chat-tab');
    var index = tabs++;
    var html = '<li name="' + channel +
        '"><a id="tab' + index + '" href="#"><i class="icon-remove"></i> ' + channel + '</a></li>';
    tab.append($(html));
    document.getElementById('tab' + index).addEventListener('click', function() {
        activateTab(index);
    }, false);
    var channels = $('#channels');
    channels.append($('<div></div>'));
    resizeGadgets();
    activateTab(index);
    return index;
};

/**
 * Show a topic in the channel topic area.
 * @param topic {string} A channel topic message.
 */
var setTopic = function (topic) {
    var obj = $('#topic');
    obj.text(topic);
    obj.get(0).title = topic;  // Tips popup.
};

/**
 * Adds a user to user list.
 * @param op {boolean} A channel operator permission.
 * @param nick {string} A user nick.
 */
var addUser = function (op, nick) {
    var naruto = op ? '@' : '';
    var html = '<tr><td>' + naruto + '</td><td>' + nick + '</td></tr>';
    $('#users>table').append($(html));
};

/**
 * Makes empty the user list.
 */
var emptyUser = function () {
    $('#users>table').empty();
};

/**
 * Updates user list from the current active channel information.
 * TODO: This function must be in GuIRC.
 */
var updateUsers = function () {
    emptyUser();
    var filter = $('#search').val().toLowerCase();
    if (!irc || (activeTab == 0))
        return;
    var name = getActiveTabName();
    var nicks = irc.channels[name].nicks;
    for (var i = 0; i < nicks.length; i++) {
        if (filter && (nicks[i].nick.toLowerCase().search(filter) < 0))
            continue;
        addUser(nicks[i].op, nicks[i].nick);
    }
};

/**
 * Sorts user list in a |channel|.
 * @param channel {string} A channel name.
 * TODO: This function must be in GuIRC.
 */
var sortUsers = function (channel) {
    if (!irc)
        return;
    irc.channels[channel].nicks.sort(function (ax, bx) {
        // Firstly, users having channel operator permission appear in
        // alphabetical order, then usual users appear in the same way.
        var a = (ax.op ? '1' : '2') + ax.nick.toLowerCase();
        var b = (bx.op ? '1' : '2') + bx.nick.toLowerCase();
        for (var i = 0; i < a.length; i++) {
            if (b.length <= i)
                return 1;  // a = b + a'
            var diff = a.charCodeAt(i) - b.charCodeAt(i);
            if (0 == diff)
                continue;
            return diff;
        }
        return -1;  // b = a + b'
    });
};

/**
 * Post message to the current tab channel. This function is invoked when user
 * submit a message from the message form tag.
 */
var postMessage = function () {
    if (!irc)
        return;

    // Obtains the message.
    var input = $('#input');
    var message = input.val();
    input.val('');
    var target = getActiveTabName();
    if (message.charAt(0) == '/') {
        // TODO: In a channel tab, we should process the command.
        var command = message.slice(1);
        irc.send(command);
        return;
    }
    // In the server tab, we can send command message only.
    if (0 != activeTab)
        irc.sendMessage(target, message);
    appendChannelMessage(activeTab, irc.nick + ' ' + message);
};

/**
 * Resizes gadgets corresponding to the window size.
 */
var resizeGadgets = function () {
    var h = window.innerHeight - 100;
    // TODO: Check tab menu height.
    var hh = ~~((h - 180) / 2);
    $('#users').css({
        overflow: 'scroll',
        height: h + 'px'
    });
    $('#channels>div').each(function () {
        $(this).css({
            overflow: 'scroll',
            height: hh + 'px',
            borderRadius: '8px',
            padding: '8px',
            backgroundColor: '#fff8f8'
        });
    });
    $('#log').css({
        overflow: 'scroll',
        height: hh + 'px',
        borderRadius: '8px',
        padding: '8px',
        backgroundColor: '#f8ffff'
    });
};

// Resize all gadgets when the window size is changed.
window.onresize = resizeGadgets;

// Runs at the start.
$(function() {
    // Install active page button handlers.
    document.getElementById('page0').addEventListener('click', function() {
        activatePage(0);
    }, false);
    document.getElementById('page1').addEventListener('click', function() {
        activatePage(1);
    }, false);
    document.getElementById('page2').addEventListener('click', function() {
        activatePage(2);
    }, false);
    document.getElementById('tab0').addEventListener('click', function() {
        activateTab(0);
    }, false);
    document.getElementById('post').addEventListener('submit', function() {
        postMessage();
        return false;
    }, false);
    document.getElementById('search').addEventListener('keyup', function() {
        updateUsers();
    }, false);

    // Resize all gadgets.
    resizeGadgets();
    // Firstly, we might show the setting page.
    chrome.storage.sync.get([
        'valid',
        'proxyHost',
        'proxyPort',
        'proxyPassword',
        'serverHost',
        'serverPort',
        'serverPassword',
        'nick',
        'keywords'], function(settings) {
        restoreConfig(settings);

        // If we already have a valid configuration, show the main page.
        // Main page activation will also create GuIRC object.
        if (settings.valid)
            activatePage(1);
    });
});