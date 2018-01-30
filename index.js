const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const CLOSE_GLOBAL = '__close__';
const COVERAGE_GLOBAL = '__coverage__';

const DEFAULT_HTML = `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title></title>
	</head>
    <body></body>
</html>
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

function normalizeOptions(options) {
	const {url, html, js, close, coverage, output} = options || {};

	return {
		url,
		html: String(html || DEFAULT_HTML),
		js: String(js || ''),
		close: close || CLOSE_GLOBAL,
		coverage: coverage || COVERAGE_GLOBAL,
		output: path.join(
			process.cwd(),
			output || `.nyc_output/${Date.now()}.json`
		)
	};
}

async function onConsole(msg) {
	const type = consoleTypes[msg.type()] || 'log';
	const args = msg.args().map(x => x.jsonValue());
	const jsonArgs = await Promise.all(args);

	console[type](...jsonArgs);
}

async function onError(err) {
	throw await err;
}

async function awaitFunction(page, name) {
	return new Promise(resolve => {
		page.exposeFunction(name, resolve);
	});
}

async function writeCoverage(page, coverage, output) {
	const coverageData = await page.waitForFunction(`window.${coverage}`);
	const coverageJson = await coverageData.jsonValue();

	// Filter out irrelevant coverage output.
	// https://github.com/artberri/rollup-plugin-istanbul/issues/9
	Object.keys(coverageJson).forEach(key => {
		if (!key.includes(path.sep)) {
			delete coverageJson[key];
		}
	});

	// Assumes output directory exists.
	fs.writeFileSync(output, JSON.stringify(coverageJson), 'utf8');
}

async function exec(browser, page, options) {
	let {url, html, js, close, coverage, output} = options;
	const closed = awaitFunction(page, close);

	if (url) {
		await page.goto(url, {waitUntil: 'networkidle0'});
	} else {
		await page.setContent(html);
	}

	if ((!url || js) && !html.includes(close) && !js.includes(close)) {
		js += `;window.${close}();`;
	}

	if (js) {
		await page.addScriptTag({content: js});
	}

	await closed;

	if (js && js.includes(coverage)) {
		await writeCoverage(page, coverage, output);
	}

	await browser.close();
}

async function runHeadless(options) {
	options = normalizeOptions(options);

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	page.on('console', onConsole);
	page.on('error', onError);
	page.on('pageerror', onError);

	const done = exec(browser, page, options);

	done.browser = browser;
	done.page = page;

	return done;
}

module.exports = runHeadless;
