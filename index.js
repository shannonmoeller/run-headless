const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const CLOSE_GLOBAL = '__close__';
const COVERAGE_GLOBAL = '__coverage__';

const defaultHtml = `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title></title>
	</head>
    <body></body>
</html>
`;

const closer = `
;window.${CLOSE_GLOBAL}();
`;

const consoleTypes = Object
	.keys(console)
	.reduce((a, b) => {
		a[b] = b;
		return a;
	}, {});

Object.assign(consoleTypes, {
	startGroup: 'group',
	endGroup: 'groupEnd',
	time: 'log',
	timeEnd: 'log'
});

async function onConsole(msg) {
	const type = consoleTypes[msg.type()] || 'log';
	const args = msg.args().map(x => x.jsonValue());
	const jsonArgs = await Promise.all(args);

	console[type](...jsonArgs);
}

function onError(err) {
	throw err;
}

async function writeCoverage(page) {
	const coverage = await page.waitForFunction(`window.${COVERAGE_GLOBAL}`);
	const output = await coverage.jsonValue();

	// Filter out irrelevant coverage output.
	// https://github.com/artberri/rollup-plugin-istanbul/issues/9
	Object.keys(output).forEach(key => {
		if (!key.includes(path.sep)) {
			delete output[key];
		}
	});

	// Assumes `nyc` has created output directory.
	fs.writeFileSync(
		path.join(process.cwd(), '.nyc_output', `${Date.now()}.json`),
		JSON.stringify(output),
		'utf8'
	);
}

async function runHeadless({html, script, url}) {
	html = String(html || defaultHtml);
	script = String(script || '');

	function addCloser() {
		if (!html.includes(CLOSE_GLOBAL) && !script.includes(CLOSE_GLOBAL)) {
			script += closer;
		}
	}

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	page.on('console', onConsole);
	page.on('error', onError);
	page.on('pageerror', onError);

	const closed = new Promise(async resolve => {
		await page.exposeFunction(CLOSE_GLOBAL, resolve);
	});

	const done = new Promise(async resolve => {
		if (url) {
			await page.goto(url, {waitUntil: 'networkidle0'});
		} else {
			addCloser();

			await page.setContent(html);
		}

		if (script) {
			addCloser();

			await page.addScriptTag({content: script});
		}

		await closed;

		if (script && script.includes(COVERAGE_GLOBAL)) {
			await writeCoverage(page);
		}

		await browser.close();

		resolve();
	});

	done.browser = browser;
	done.page = page;

	return done;
}

module.exports = runHeadless;
