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

      --html <s>      Literal HTML to execute. Defaults to minimal skeleton.
      --js <s>        Literal JavaScript to execute (default: stdin).
      --url <s>       URL to load (overrides --html).
      --close <s>     Close global function (default: \`__close__\`).
      --coverage <s>  Coverage global variable (default: \`__coverage__\`).
      --output <s>    Coverage output file (default: \`.nyc_output/<rand>.json\`).
  -h, --help          Print help.
```

## Examples

```command
$ echo 'console.log("hello world")' | run-headless
hello world

$ run-headless --js 'console.log("hello world")'
hello world
```

```command
$ cat index.js | run-headless
$ rollup index.js | run-headless
$ browserify index.js | run-headless
```

```command
$ run-headless --html "<script>console.log('hello world');</script>"
$ run-headless --html "$(cat index.html)" --js "$(cat index.js)"
```

```command
$ run-headless --url "http://localhost:3000/tests"
$ run-headless --url "https://google.com" --js "console.log(document.title)"
```

### CI

Headless browsers are well suited to running in CI environments. Configurations vary, but this `.travis.yml` file should get you going with [Travis](https://travis-ci.org):

```yml
sudo: required
language: node_js
addons:
 chrome: stable
node_js:
  - node
  - '8'
```

### Browser Testing

You can use any test runner you like that works in a browser and outputs to the console. Just make sure to run `window.__close__()` when all tests have completed. When writing tests that run in Node.js and the browser you may include the convenience helper `run-headless/close` to do this for you as needed.

```js
// test.js

const close = require('run-headless/close');
const test = require('tape');

test('should pass', t => {
    t.pass('yay!');
    t.end();
});

test.onFinish(close);
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

- `options` `{Object}`
  - `html` `{String}` - Literal HTML to execute. Defaults to minimal skeleton.
  - `js` `{String}` - Literal JavaScript to execute (default: `stdin`).
  - `url` `{String}` - URL to load (overrides `html`).
  - `close` `{String}` - Close global function (default: `__close__`).
  - `coverage` `{String}` - Coverage global variable (default: `__coverage__`).
  - `output` `{String}` - Coverage output file (default: `.nyc_output/<rand>.json`).

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
            js: code
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

MIT © [Shannon Moeller](http://shannonmoeller.com)

[coveralls-img]: http://img.shields.io/coveralls/shannonmoeller/run-headless/master.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/shannonmoeller/run-headless
[downloads-img]: http://img.shields.io/npm/dm/run-headless.svg?style=flat-square
[npm-img]:       http://img.shields.io/npm/v/run-headless.svg?style=flat-square
[npm-url]:       https://npmjs.org/package/run-headless
[travis-img]:    http://img.shields.io/travis/shannonmoeller/run-headless.svg?style=flat-square
[travis-url]:    https://travis-ci.org/shannonmoeller/run-headless
