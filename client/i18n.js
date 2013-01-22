/**
 * Copyright (c) 2013, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
var i18n = function () {
    $('#nav-main').text(chrome.i18n.getMessage('navMain'));
    $('#nav-config').text(chrome.i18n.getMessage('navConfig'));
    $('#main-server').text(chrome.i18n.getMessage('mainServer'));
    $('#input').attr('placeholder', chrome.i18n.getMessage('mainPostHint'));
    $('#main-member').text(chrome.i18n.getMessage('mainMember'));
    $('#search').attr('placeholder', chrome.i18n.getMessage('mainSearchHint'));
    $('#config-legend-proxy').text(chrome.i18n.getMessage('configLegendProxy'));
    $('#config-label-proxy-type').text(chrome.i18n.getMessage('configLabelConnectionType'));
    $('#config-span-proxy-socketio').text(chrome.i18n.getMessage('configConnectionSocketIO'));
    $('#config-span-proxy-websocket').text(chrome.i18n.getMessage('configConnectionWebSocket'));
    $('#config-span-proxy-chromesocket').text(chrome.i18n.getMessage('configConnectionChromeSocket'));
    $('#config-label-proxy-host').text(chrome.i18n.getMessage('configLabelHost'));
    $('#config-input-proxy-host').attr('placeholder', chrome.i18n.getMessage('configMandatoryHint'));
    $('#config-label-proxy-port').text(chrome.i18n.getMessage('configLabelPort'));
    $('#config-input-proxy-port').attr('placeholder', chrome.i18n.getMessage('configMandatoryHint'));
    $('#config-label-proxy-password').text(chrome.i18n.getMessage('configLabelPassword'));
    $('#config-input-proxy-password').attr('placeholder', chrome.i18n.getMessage('configOptionalHint'));
    $('#config-legend-server').text(chrome.i18n.getMessage('configLegendServer'));
    $('#config-label-server-host').text(chrome.i18n.getMessage('configLabelHost'));
    $('#config-input-server-host').attr('placeholder', chrome.i18n.getMessage('configMandatoryHint'));
    $('#config-label-server-port').text(chrome.i18n.getMessage('configLabelPort'));
    $('#config-input-server-port').attr('placeholder', chrome.i18n.getMessage('configMandatoryHint'));
    $('#config-label-server-password').text(chrome.i18n.getMessage('configLabelPassword'));
    $('#config-input-server-password').attr('placeholder', chrome.i18n.getMessage('configOptionalHint'));
    $('#config-legend-user').text(chrome.i18n.getMessage('configLegendUser'));
    $('#config-label-nickname').text(chrome.i18n.getMessage('configLabelNickname'));
    $('#config-input-nickname').attr('placeholder', chrome.i18n.getMessage('configMandatoryHint'));
    $('#config-legend-notification').text(chrome.i18n.getMessage('configLegendNotification'));
    $('#config-label-keywords').text(chrome.i18n.getMessage('configLabelKeywords'));
    $('#config-input-keywords').attr('placeholder', chrome.i18n.getMessage('configKeywordsHint'));
    $('#config-submit').text(chrome.i18n.getMessage('configSubmit'));
}

window.addEventListener("load", i18n, false);