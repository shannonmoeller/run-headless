const test = require('blue-tape');
const close = require('../close');
const foo = require('./foo.js');
const bar = require('./bar.js');

test('should sum numbers', async t => {
	t.equal(foo + bar, 3);
	t.comment('hello from test');
});

test('should sum numbers again', async t => {
	t.equal(foo + bar, 3);
	t.comment('hello from test');
});

test.onFinish(close);
