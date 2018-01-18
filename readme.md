# run-headless

[![NPM version][npm-img]][npm-url] [![Downloads][downloads-img]][npm-url] [![Build Status][travis-img]][travis-url] [![Coverage Status][coveralls-img]][coveralls-url]

The easiest way of running code in a modern [headless browser environment](http://npm.im/puppeteer).

## Install

```command
$ npm install --global run-headless
```

## Usage

```man
Usage: run-headless [options]

Options:

      --html <s>    Literal HTML to use as tests or test harness.
      --script <s>  Literal JavaScript to execute (default: stdin).
      --url <s>     URL of page containing tests to run.
  -h, --help        Print help.
```

## Examples

```command
$ run-headless --script 'console.log("hello world"); window.close();'
hello world

$ echo 'console.log("hello world"); window.close();' | run-headless
hello world
```

```command
$ cat index.js | run-headless
$ rollup index.js | run-headless
$ browserify index.js | run-headless
$ run-headless --url 'http://localhost:3000/tests'
```

```command
$ run-headless --url 'http://google.com' --script 'console.log(document.title); window.close();'
Google
```

### Writing Tests

You can use any test runner you like that works in a browser and outputs to the console. Just make sure to run `window.close()` when all tests have completed. When writing tests that run in Node.js and the browser you may include the convenience helper `run-headless/end` to do this for you as needed.

```js
// test.js

const end = require('run-headless/end');
const test = require('tape');

test('should pass', t => {
    t.pass('yay!');
    t.end();
});

test.onFinish(end);
```

```command
$ browserify test.js | run-headless | tap-diff

  should pass
    ✔  yay!

passed: 1  failed: 0  of 1 tests  (763ms)

All of 1 tests passed!
```

## API

### `run(options): Runner`

- `options` `{Object}` - You must specify at least one of the following:
  - `html` `{String}` - Optional. Literal HTML use to use as test harness.
  - `script` `{String}` - Optional. Literal JavaScript to execute.
  - `url` `{String}` - Optional. URL of page containing tests to run.

The following example starts up a static file server with [express](http://npm.im/express), bundles test scripts with [rollup](http://npm.im/rollup), executes them in a [headless browser](http://npm.im/puppeteer), and prints the output to the console. (Assumes that your rollup config is generating a bundle with [nyc](http://npm.im/nyc)-compatible instrumented code).

```js
// test.js

const run = require('run-headless');
const express = require('express');
const rollup = require('rollup');

const server = express
    .use(express.static(__dirname))
    .listen(3000, async () => {
        const bundle = await rollup.rollup({ ... });
        const { code } = await bundle.generate({ ... });

        await run({
            url: 'http://localhost:3000/tests.html',
            script: code
        });

        server.close();
    });
```

```command
$ nyc node test.js
... test output ...
... coverage output ...
```

### Runner Methods

#### `.then()` and `.catch()`

`Runner` is a thenable and awaitable [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) object. It resolves when execution has finished and the browser is closed.

#### `.close(): Promise`

Can be used to explicitly close the browser, though it's better to call `window.close()` from within the script.

### Runner Properties

#### `.browser` `{Browser}`

A puppeteer [Browser](https://github.com/GoogleChrome/puppeteer/blob/HEAD/docs/api.md#class-browser) instance.

#### `.page` `{Page}`

A puppeteer [Page](https://github.com/GoogleChrome/puppeteer/blob/HEAD/docs/api.md#class-page) instance.

## Contribute

Standards for this project, including tests, code coverage, and semantics are enforced with a build tool. Pull requests must include passing tests with 100% code coverage and no linting errors.

### Test

```command
$ npm test
```

### Acknowledgements

- [browser-run](http://npm.im/browser-run)
- [run-browser](http://npm.im/run-browser)
- [karma](http://npm.im/karma)

----

© Shannon Moeller <me@shannonmoeller.com> (shannonmoeller.com)

Licensed under [MIT](http://shannonmoeller.com/mit.txt)

[coveralls-img]: http://img.shields.io/coveralls/shannonmoeller/run-headless/master.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/shannonmoeller/run-headless
[downloads-img]: http://img.shields.io/npm/dm/run-headless.svg?style=flat-square
[npm-img]:       http://img.shields.io/npm/v/run-headless.svg?style=flat-square
[npm-url]:       https://npmjs.org/package/run-headless
[travis-img]:    http://img.shields.io/travis/shannonmoeller/run-headless.svg?style=flat-square
[travis-url]:    https://travis-ci.org/shannonmoeller/run-headless
