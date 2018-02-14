const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const uuid = require('uuid/v4');

const DEFAULT_CLOSE_VAR = '__close__';
const DEFAULT_COVERAGE_VAR = '__coverage__';
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

const consoleTypes = Object.keys(console).reduce((a, b) => {
	a[b] = b;

	return a;
}, {});

Object.assign(consoleTypes, {
	startGroup: 'group',
	endGroup: 'groupEnd',
	time: 'log',
	timeEnd: 'log',
});

function normalizeOptions(options) {
	const {
		html,
		js,
		url,
		closeVar,
		coverageVar,
		outputDir,
		outputFile,
	} = options;

	return {
		html: html || DEFAULT_HTML,
		js: js || '',
		url: url || '',
		closeVar: closeVar || DEFAULT_CLOSE_VAR,
		coverageVar: coverageVar || DEFAULT_COVERAGE_VAR,
		outputFile: path.join(
			process.cwd(),
			outputFile ? '' : outputDir || `.nyc_output`,
			outputFile || `${uuid()}.json`
		),
	};
}

async function onConsole(msg) {
	const type = consoleTypes[msg.type()] || 'log';
	const args = msg.args().map((x) => x.jsonValue());
	const jsonArgs = await Promise.all(args);

	console[type](...jsonArgs);
}

async function onError(err) {
	throw await err;
}

async function awaitFunctionCall(page, name) {
	return new Promise((resolve) => {
		page.exposeFunction(name, resolve);
	});
}

async function writeCoverage(page, coverage, output) {
	const coverageData = await page.waitForFunction(`window.${coverage}`);
	const coverageJson = await coverageData.jsonValue();

	// Filter out irrelevant coverage output.
	// https://github.com/artberri/rollup-plugin-istanbul/issues/9
	Object.keys(coverageJson).forEach((key) => {
		if (!key.includes(path.sep)) {
			delete coverageJson[key];
		}
	});

	// Assumes output directory exists.
	fs.writeFileSync(output, JSON.stringify(coverageJson), 'utf8');
}

async function execScript(browser, page, options) {
	const { html, js, url, closeVar, coverageVar, outputFile } = options;
	const closed = awaitFunctionCall(page, closeVar);
	let content = js;

	if (url) {
		await page.goto(url, { waitUntil: 'networkidle0' });
	} else {
		await page.setContent(html);
	}

	if (
		(!url || content) &&
		!html.includes(closeVar) &&
		!content.includes(closeVar)
	) {
		content += `;window.${closeVar}();`;
	}

	if (content) {
		await page.addScriptTag({ content });
	}

	await closed;

	if (content && content.includes(coverageVar)) {
		await writeCoverage(page, coverageVar, outputFile);
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

	const done = execScript(browser, page, options);

	done.browser = browser;
	done.page = page;

	return done;
}

module.exports = runHeadless;
