'use strict';

const fs = require('fs');
const bcrypt = require('bcrypt');

module.exports = class users {
    constructor () {
        this.users = {};
        this.html = '';
        this.htmlFailed = '';
    }

    check (username, pass) {
        if (global.debug) {
            console.log('DEBUG: testing user ' + username);
        }
        //Better: Asynchronous. Server thread is blocked for some millis with this.
        return bcrypt.compareSync(pass, this.users[username]);
    }
}
