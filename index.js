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

async function run({html, script, url}) {
	html = String(html || defaultHtml);
	script = String(script || '');

	if (script && !script.includes(CLOSE_GLOBAL)) {
		script += `;window.${CLOSE_GLOBAL}();`;
	}

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	page.on('console', onConsole);
	page.on('error', onError);
	page.on('pageerror', onError);

	const done = new Promise(async resolve => {
		async function close() {
			if (global[COVERAGE_GLOBAL]) {
				Object.assign(
					global[COVERAGE_GLOBAL],
					await page.waitForFunction(`window.${COVERAGE_GLOBAL}`)
				);
			}

			await browser.close();

			resolve();
		}

		await page.exposeFunction(CLOSE_GLOBAL, close);

		if (url) {
			await page.goto(url, {waitUntil: 'networkidle0'});
		} else {
			await page.setContent(html);
		}

		if (script) {
			await page.addScriptTag({content: script});
		}
	});

	done.browser = browser;
	done.page = page;

	return done;
}

module.exports = run;
