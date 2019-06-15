
build: server.js app/*
	yarn
	yarn install
	node_modules/gulp/bin/gulp.js dist

PREFIX = /usr/local

.PHONY: install
install: build
	mkdir -p $(DESTDIR)$(PREFIX)/lib/llgCompanion
	cp ./server.js $(DESTDIR)$(PREFIX)/lib/llgCompanion/server.js
	cp -r ./dist $(DESTDIR)$(PREFIX)/lib/llgCompanion/dist
	cp  ./createUser.js $(DESTDIR)$(PREFIX)/lib/llgCompanion/createUser.js
	cp -r ./modules $(DESTDIR)$(PREFIX)/lib/llgCompanion/modules
	cp -r ./node_modules $(DESTDIR)$(PREFIX)/lib/llgCompanion/node_modules

.PHONY: uninstall
uninstall:
	rm -rf $(DESTDIR)$(PREFIX)/lib/llgCompanion