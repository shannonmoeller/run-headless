const tape = require('tape');
const end = require('../end');
const foo = require('./foo.js');
const bar = require('./bar.js');

tape('should sum numbers', t => {
	t.equal(foo + bar, 3);
	t.comment('hello from test');
	t.end();
});

tape.onFinish(end);
