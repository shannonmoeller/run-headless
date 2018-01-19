const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

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
;window.__close__();
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
	const coverage = await page.waitForFunction('window.__coverage__');
	const output = await coverage.jsonValue();

	// Filter out irrelevant coverage output.
	// https://github.com/artberri/rollup-plugin-istanbul/issues/9
	Object.keys(output).forEach(key => {
		if (!key.includes(path.sep)) {
			delete output[key];
		}
	});

	fs.writeFileSync(
		path.join(process.cwd(), '.nyc_output', `${Date.now()}.json`),
		JSON.stringify(output),
		'utf8'
	);
}

async function runHeadless({html, script, url}) {
	html = String(html || defaultHtml);
	script = String(script || '');

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	page.on('console', onConsole);
	page.on('error', onError);
	page.on('pageerror', onError);

	const closed = new Promise(async resolve => {
		await page.exposeFunction('__close__', resolve);
	});

	const done = new Promise(async resolve => {
		if (url) {
			await page.goto(url, {waitUntil: 'networkidle0'});
		} else {
			await page.setContent(html);
		}

		if (script) {
			if (!script.includes('__close__')) {
				script += closer;
			}

			await page.addScriptTag({content: script});
		}

		await closed;

		if (script && script.includes('__coverage__')) {
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
