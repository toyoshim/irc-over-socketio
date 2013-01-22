/**
 * Copyright (c) 2012, 2013, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
/**
 * IRC over Socket.IO setting page functions.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
// @type {number} The number of alerts in the setting page
var alerts = 0;

/**
 * Sync storage format memo:
 * @type {boolean} valid ... IRC over Socket.IO has a valid setting data in
 *                           the sync storage.
 * @type {string} proxyHost ... Proxy server host name.
 * @type {number} proxyPort ... Proxy server port number.
 * @type {string} proxyPassword ... Proxy server password [optional].
 * @type {string} serverHost ... IRC server host name.
 * @type {number} serverPort ... IRC server port number.
 * @type {string} serverPassword ... IRC server password [optional].
 * @type {string} nick ... IRC nick name.
 * @type {string} keywords ... Comma separated keyword list for notification.
 */

/**
 * Check if the specified |string| is a valid number.
 * @param string {string} A string to be checked.
 * @return {Boolean} true if |string| is a valid number.
 */
var isValidNumber = function (string) {
    var number = Number(string);
    return number.toString() == string;
};

/**
 * Clear all alerts in the setting page.
 */
var clearAlert = function () {
    var alertHolder = $('#alert');
    alertHolder.empty();
    alerts = 0;
};

/**
 * Add a alert in the setting page.
 * @param alert {string} Alert message.
 */
var addAlert = function (alert) {
    var alertHolder = $('#alert');
    var html = '<div class="alert">' + alert + '</div>';
    alertHolder.append($(html));
    alerts++;
};

/**
 * Restore setting data from the sync storage to the setting page.
 * This function must be called at showing the setting page.
 * @param settings {object} Settings in sync storage format.
 */
var restoreConfig = function (settings) {
    var id = 0;
    var form = $('#config input');
    /* TODO: http://irc.hasb.ug/17
    if (settings.connectionType == TCPClient.TYPE_SOCKETIO)
        form.eq(id).attr('checked', true);
     */
    id++;
    if (settings.connectionType == TCPClient.TYPE_WEBSOCKET)
        form.eq(id).attr('checked', true);
    id++;
    if (settings.connectionType == TCPClient.TYPE_CHROMESOCKET)
        form.eq(id).attr('checked', true);
    var socket = chrome.socket ||
            (chrome.experimental && chrome.experimental.socket);
    if (socket && !settings.connectionType) {
        form.eq(id).attr('checked', true);
        settings.connectionType = TCPClient.TYPE_CHROMESOCKET;
    }
    form.eq(id++).attr('disabled', !socket);
    form.eq(id++).val(settings.proxyHost);
    form.eq(id++).val(settings.proxyPort);
    form.eq(id++).val(settings.proxyPassword);
    if (settings.serverHost)
        form.eq(id).val(settings.serverHost);
    id++;
    if (settings.serverPort)
        form.eq(id).val(settings.serverPort);
    id++;
    form.eq(id++).val(settings.serverPassword);
    form.eq(id++).val(settings.nick);
    form.eq(id++).val(settings.keywords);

    // Store configuration in global environment.
    window.ios = {};
    window.ios.settings = settings;
};

/**
 * Checks setting data and shows alerts if needed, and saves all setting data
 * to the sync storage.
 * This function must be called to save the setting data.
 */
var saveConfig = function () {
    // TODO: i18n on alert messages. See, also http://irc.hasb.ug/14
    clearAlert();
    var settings = {};
    var id = 1;
    var form = $('#config input');
    var type = TCPClient.TYPE_SOCKETIO;  // id == 0
    if (form.eq(id++).attr('checked'))
        type = TCPClient.TYPE_WEBSOCKET;
    if (form.eq(id++).attr('checked'))
        type = TCPClient.TYPE_CHROMESOCKET;
    settings.connectionType = type;
    var proxyHost = form.eq(id++).val();
    if (type != TCPClient.TYPE_CHROMESOCKET && !proxyHost)
        addAlert("プロキシ設定のホスト名を指定してください");
    else
        settings.proxyHost = proxyHost;
    var proxyPort = form.eq(id++).val();
    if (type != TCPClient.TYPE_CHROMESOCKET && !proxyPort)
        addAlert("プロキシ設定のポート番号を指定してください");
    else if (type != TCPClient.TYPE_CHROMESOCKET && !isValidNumber(proxyPort))
        addAlert("プロキシ設定のポート番号は数字を指定してください");
    else
        settings.proxyPort = proxyPort;
    settings.proxyPassword = form.eq(id++).val();
    var serverHost = form.eq(id++).val();
    if (!serverHost)
        addAlert("IRCサーバ設定のホスト名を指定してください");
    else
        settings.serverHost = serverHost;
    var serverPort = form.eq(id++).val();
    if (!serverPort)
        addAlert("IRCサーバ設定のポート番号を指定してください");
    else if (!isValidNumber(serverPort))
        addAlert("IRCサーバ設定のポート番号は数字を指定してください");
    else
        settings.serverPort = serverPort;
    settings.serverPassword = form.eq(id++).val();
    var nick = form.eq(id++).val();
    if (!nick)
        addAlert("ユーザー設定のニックネームを指定してください");
    else
        settings.nick = nick;
    settings.keywords = form.eq(id++).val();
    if (0 != alerts)
        return;

    if (settings.keywords &&
        (window.webkitNotifications.checkPermission() != 0)) {
        // Request notification permission. This permission request is allowed
        // iff it is called in user action callback.
        window.webkitNotifications.requestPermission();
    }
    settings.valid = true;

    // Store settings into sync storage and global environment.
    chrome.storage.sync.set(settings, function() {});
    window.ios.settings = settings;

    activatePage(1);
};

/**
 * Install submit event listener.
 */
window.addEventListener("load", function() {
    document.getElementById('config').addEventListener('submit', function() {
        saveConfig();
        return false;
    }, false);
}, false);
