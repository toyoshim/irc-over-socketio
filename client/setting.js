/**
 * Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
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
 * Local storage format memo:
 * @type {boolean} valid ... IRC over Socket.IO has a valid setting data in
 *                           the local storage.
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
 * Restore setting data from the local storage to the setting page.
 * This function must be called at showing the setting page.
 */
var restoreConfig = function () {
    var id = 0;
    var form = $('#config input');
    id++;
    var socket = chrome.socket ||
            (chrome.experimental && chrome.experimental.socket);
    form.eq(id++).attr('disabled', !socket);
    form.eq(id++).val(localStorage.proxyHost);
    form.eq(id++).val(localStorage.proxyPort);
    form.eq(id++).val(localStorage.proxyPassword);
    if (localStorage.serverHost)
        form.eq(id).val(localStorage.serverHost);
    id++;
    if (localStorage.serverPort)
        form.eq(id).val(localStorage.serverPort);
    id++;
    form.eq(id++).val(localStorage.serverPassword);
    form.eq(id++).val(localStorage.nick);
    form.eq(id++).val(localStorage.keywords);
};

/**
 * Checks setting data and shows alerts if needed, and saves all setting data
 * to the local storage.
 * This function must be called to save the setting data.
 */
var saveConfig = function () {
    clearAlert();
    var id = 0;
    var form = $('#config input');
    id++; // Socket.IO
    id++; // chrome.socket
    var proxyHost = form.eq(id++).val();
    if (!proxyHost)
        addAlert("プロキシ設定のホスト名を指定してください");
    else
        localStorage.proxyHost = proxyHost;
    var proxyPort = form.eq(id++).val();
    if (!proxyPort)
        addAlert("プロキシ設定のポート番号を指定してください");
    else if (!isValidNumber(proxyPort))
        addAlert("プロキシ設定のポート番号は数字を指定してください");
    else
        localStorage.proxyPort = proxyPort;
    localStorage.proxyPassword = form.eq(id++).val();
    var serverHost = form.eq(id++).val();
    if (!serverHost)
        addAlert("IRCサーバ設定のホスト名を指定してください");
    else
        localStorage.serverHost = serverHost;
    var serverPort = form.eq(id++).val();
    if (!serverPort)
        addAlert("IRCサーバ設定のポート番号を指定してください");
    else if (!isValidNumber(serverPort))
        addAlert("IRCサーバ設定のポート番号は数字を指定してください");
    else
        localStorage.serverPort = serverPort;
    localStorage.serverPassword = form.eq(id++).val();
    var nick = form.eq(id++).val();
    if (!nick)
        addAlert("ユーザー設定のニックネームを指定してください");
    else
        localStorage.nick = nick;
    localStorage.keywords = form.eq(id++).val();
    if (0 != alerts)
        return;

    if (localStorage.keywords &&
        (window.webkitNotifications.checkPermission() != 0)) {
        // Request notification permission. This permission request is allowed
        // iff it is called in user action callback.
        window.webkitNotifications.requestPermission();
    }
    localStorage.valid = true;
    activatePage(1);
};
