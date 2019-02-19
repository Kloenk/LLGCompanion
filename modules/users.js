'use strict';

const fs = require('fs');

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
        return (this.users[username] === pass);
    }
}