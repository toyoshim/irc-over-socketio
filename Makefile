# Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
# All rights reserved.
# Use of this source code is governed by a BSD-style license that can be found
# in the LICENSE file.

all:
	@echo "checkout ... checkout third party libraries"
	@echo "clean    ... delete temporal files"

# Run proxy server in local machine.
run:
	(cd server; PASSWORD=try node app.js)

# Checkout libraries.
checkout:
	mkdir third_party
	(cd third_party; git clone https://code.google.com/p/jslt/)
	(cd third_party/jslt; git checkout c9e8df5d75c9)
	cp third_party/jslt/MD5.js server/
#	cp third_party/jslt/MD5.js client/
	cp third_party/jslt/ArrayBuffer.js server/

# Delete external libraries.
clean:
	rm -rf third_party server/MD5.js server/ArrayBuffer.js client/MD5.js

