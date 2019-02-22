'use strict';

const assert = require('assert');

module.exports = {
	test_user_check (usersLIB) {
		usersLIB.users = {
			'correct': '$2b$08$6ce8PhwTFoLUVuQ5BX.RLOQdrjhP1Z.oX.aAdW5A0/IcHUGrAWUZG', // correct
			'wrong': 'wrong'
		};
		assert.equal(usersLIB.check('correct', 'correct'), true);
		assert.equal(usersLIB.check('wrong', 'crazy stuff'), false);
	}
};
