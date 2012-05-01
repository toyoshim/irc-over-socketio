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
	(cd third_party/jslt; git checkout c9e8df5d75c95275986f7ddfc57390abcf3ecfd9)
	cp third_party/jslt/MD5.js server/
	cp third_party/jslt/MD5.js client/
	cp third_party/jslt/ArrayBuffer.js server/
	(cd server; npm install)
	cp server/node_modules/socket.io/support/socket.io-client/socket.io.min.js client/
	(cd third_party; wget http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js)
	cp third_party/jquery.min.js client/
	(cd third_party; git clone https://github.com/twitter/bootstrap.git)
	(cd third_party/bootstrap; git checkout b261f9781bbf31f499cb55c49451dc0c0ad43062)
	(cd third_party/bootstrap; make bootstrap)
	mkdir -p client/css client/img
	cp third_party/bootstrap/bootstrap/css/bootstrap-responsive.min.css client/css
	cp third_party/bootstrap/bootstrap/css/bootstrap.min.css client/css
	cp third_party/bootstrap/bootstrap/img/glyphicons-halflings.png client/img/
	cp third_party/bootstrap/bootstrap/img/glyphicons-halflings-white.png client/img/

# Delete external libraries.
clean:
	rm -rf third_party server/node_modules server/MD5.js server/ArrayBuffer.js client/MD5.js client/socket.io.min.js client/jquery.min.js client/css/bootstrap-responsive.min.css client/css/bootstrap.min.css client/img/glyphicons-halflings.png client/img/glyphicons-halflings-white.png

