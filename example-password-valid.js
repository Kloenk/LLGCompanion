const bcrypt = require('bcrypt');

users = require('./users.json');

console.log("trying 'admin' + 'bar'");
console.log(bcrypt.compareSync("bar", users["admin"]));

console.log("trying 'admin' + 'foo'");
console.log(bcrypt.compareSync("foo", users["admin"]));
