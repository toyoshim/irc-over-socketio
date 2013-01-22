/**
 * Copyright (c) 2013, Takashi Toyoshima <toyoshim@gmail.com>
 * All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be found
 * in the LICENSE file.
 */
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('app.html', {
    'width': 1200,
    'height': 800
  });
});
