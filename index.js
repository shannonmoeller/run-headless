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

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	page.on('console', onConsole);
	page.on('error', onError);
	page.on('pageerror', onError);

	const done = new Promise(async resolve => {
		await page.exposeFunction('close', async () => {
			let coverage;

			if (global.__coverage__) {
				coverage = await page.waitForFunction('window.__coverage__');

				Object.assign(global.__coverage__, coverage);
			}

			await page.close();
			await browser.close();

			resolve(coverage);
		});

		if (url) {
			await page.goto(url, {waitUntil: 'networkidle0'});
		} else {
			await page.setContent(html);
		}

		if (script) {
			await page.addScriptTag({content: script});
		}
	});

	done.close = () => page.evaluate(() => window.close());
	done.browser = browser;
	done.page = page;

	return done;
}

module.exports = run;
