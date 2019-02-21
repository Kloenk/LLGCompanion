const fs = require('fs');
const bcrypt = require('bcrypt');
const readline = require('readline');

users = require('./users.json');


const consoleIn  = readline.createInterface(process.stdin, process.stdout);

function main() {
    consoleIn.question('Enter a username: ', (name) => {
        consoleIn.question('Enter the password: ', (password) => {
            setUserPassword(name, password);
            consoleIn.close();
        });
    });
}

function setUserPassword(name, password) {
    hash = bcrypt.hashSync(password, 8);
    users[name] = hash;
    console.log('Added: ', name, ' with hash ', hash);
    saveFile();
}

function saveFile() {
    fs.writeFile('./users.json', JSON.stringify(users), 'utf8', 
        function(error) {
            if (error) throw error;
            console.log('Saved to users.json!');
    });
}

main();
