# Copyright (c) 2012, Takashi Toyoshima <toyoshim@gmail.com>
# All rights reserved.
# Use of this source code is governed by a BSD-style license that can be found
# in the LICENSE file.

all:
	@echo "checkout ... checkout and build third party libraries"
	@echo "clean    ... delete temporal files"
	@echo "setup    ... install build tools locally"

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
	(cd server; PATH=`pwd`/../tools/node-0.4.7/bin:${PATH} npm install)
	cp server/node_modules/socket.io/support/socket.io-client/socket.io.min.js client/
	(cd third_party; wget http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js)
	cp third_party/jquery.min.js client/
	(cd third_party; git clone https://github.com/twitter/bootstrap.git)
	(cd third_party/bootstrap; git checkout 59503e71ff06d0fd065c2fb981f55f4651ebc274)
	(cd third_party/bootstrap; PATH=`pwd`/../../tools/node-0.4.7/bin:`pwd`/../../tools/UglifyJS/bin:${PATH} make bootstrap)
	mkdir -p client/css client/img
	cp third_party/bootstrap/bootstrap/css/bootstrap-responsive.min.css client/css
	cp third_party/bootstrap/bootstrap/css/bootstrap.min.css client/css
	cp third_party/bootstrap/bootstrap/img/glyphicons-halflings.png client/img/
	cp third_party/bootstrap/bootstrap/img/glyphicons-halflings-white.png client/img/

# Delete external libraries.
clean:
	rm -rf third_party server/node_modules server/MD5.js server/ArrayBuffer.js client/MD5.js client/socket.io.min.js client/jquery.min.js client/css/bootstrap-responsive.min.css client/css/bootstrap.min.css client/img/glyphicons-halflings.png client/img/glyphicons-halflings-white.png

setup: tools/node-0.4.7/bin/node tools/node-0.4.7/bin/npm tools/node-0.4.7/bin/lessc tools/UglifyJS/bin/uglifyjs

tools/node-0.4.7/bin/node:
	mkdir -p tools/node-0.4.7/src
	(cd tools/node-0.4.7/src; wget http://nodejs.org/dist/node-v0.4.7.tar.gz; tar zxf node-v0.4.7.tar.gz)
	(cd tools/node-0.4.7/src/node-v0.4.7; ./configure --prefix=`pwd`/../..; make; make install)

tools/node-0.4.7/bin/npm:
	(cd tools/node-0.4.7/src; wget http://npmjs.org/install.sh; PATH=`pwd`/../bin:${PATH} /bin/sh install.sh)

tools/node-0.4.7/bin/lessc:
	PATH=./tools/node-0.4.7/bin:${PATH} npm install -g less

tools/UglifyJS/bin/uglifyjs:
	(cd tools; git clone https://github.com/mishoo/UglifyJS.git)
	(cd tools/UglifyJS: git checkout a3fcb0d2aa8b3b78193dbe2b59994a5b65d552a4)
