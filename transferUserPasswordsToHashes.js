const fs = require('fs');
const bcrypt = require('bcrypt');

users = require('./users.json');
Object.keys(users).forEach(function(user) {
    users[user] = bcrypt.hashSync(users[user], 8);
});

fs.writeFile('./users.json', JSON.stringify(users), 'utf8', 
        function(error) {
            if (error) throw error;
            console.log('convertion completed');
        });
