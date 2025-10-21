import { Browser, ElementHandle, Page } from 'rebrowser-puppeteer-core';
import { installMouseHelper } from 'ghost-cursor';
import { Account } from '@utils/account';
import { AdsPower } from './adsPower';
import { MissingFieldError } from './errors';
import { Vision } from './vision';

const ALLOWED_BROWSERS = ['AdsPower', 'Vision'];

export async function openBrowser(browserName: string, account: Account): Promise<Browser> {
	let browser;
	if (browserName === 'AdsPower') {
		if (!account.adsPower?.profileId) throw new MissingFieldError('adsPower.profileId');
		browser = await AdsPower.openBrowser(account.adsPower.profileId);
	} else if (browserName === 'Vision') {
		if (!account.vision?.token) throw new MissingFieldError('vision.token');
		if (!account.vision?.folderId) throw new MissingFieldError('vision.folderId');
		if (!account.vision?.profileId) throw new MissingFieldError('vision.profileId');
		browser = await Vision.openBrowser(account.vision.token, account.vision.folderId, account.vision.profileId, []);
	} else {
		throw new Error(`Browser ${browserName} is not supported! Allowed browsers: ${ALLOWED_BROWSERS.join(', ')}`);
	}

	return browser;
}

export async function closeBrowser(browserName: string, account: Account): Promise<void> {
	if (!browserName || !ALLOWED_BROWSERS.includes(browserName))
		throw new Error(`Browser ${browserName} is not allowed! Allowed browsers: ${ALLOWED_BROWSERS.join(', ')}`);

	if (browserName === 'AdsPower') {
		if (!account.adsPower?.profileId) throw new MissingFieldError('adsPower.profileId');
		await AdsPower.stopProfile(account.adsPower.profileId);
	} else {
		if (!account.vision?.folderId) throw new MissingFieldError('vision.folderId');
		if (!account.vision?.profileId) throw new MissingFieldError('vision.profileId');
		await Vision.stopProfile(account.vision.folderId, account.vision.profileId);
	}
}

export async function getExtensionPage(browser: Browser, url?: string): Promise<Page | undefined> {
	let page: Page | undefined = undefined;
	await browser.pages().then((pages) => {
		page = pages.find((p) => p.url().includes(url ?? 'chrome-extension'));
	});
	return page;
}

export async function getElementProperty(element: ElementHandle<Element>, propertyName: string): Promise<string | undefined> {
	const propertyValue = (await (await element.getProperty(propertyName)).jsonValue()) as string;
	return propertyValue;
}

export async function getPage(browser: Browser, url = '', mouseHelper = false) {
	try {
		const page = await browser.newPage();

		await browser.pages().then(async (pages) => {
			const existedPages = pages.filter((p) => p.url().includes(url));

			if (existedPages.length) {
				for (const page of existedPages) {
					await safeClosePage(page);
				}
			}
		});

		if (mouseHelper) await installMouseHelper(page);
		await page.goto(url, { timeout: 60_000 });

		return page;
	} catch (e: any) {
		if (e.toString().includes('net::ERR_TIMED_OUT at')) throw new Error(`Couldnt open page ${url} in 60s`);
		else if (
			e.toString().includes('net::ERR_PROXY_CONNECTION_FAILED at') ||
			e.toString().includes('net::ERR_CONNECTION_RESET at')
		)
			throw new Error(`Couldnt open page ${url}. Maybe need proxy?`);
		else throw e;
	}
}

export async function getElementByText(page: Page, selector: string, text?: string): Promise<ElementHandle<Element> | undefined> {
	const element = await page.$(text ? `${selector} ::-p-text("${text}")` : selector);

	return element ?? undefined;
}

export async function waitForElement(
	page: Page,
	selector: string,
	text?: string,
	timeoutInMs = 60_000,
): Promise<ElementHandle<Element>> {
	const elem = await page.waitForSelector(text ? `${selector} ::-p-text("${text}")` : selector, {
		timeout: timeoutInMs,
		visible: true,
	});

	if (!elem) {
		const message = `Couldnt find element with selector '${selector}' and text '${text}' with timeout ${timeoutInMs} ms.`;
		throw new Error(message);
	}

	return elem;
}

export async function clearCache(page: Page) {
	await page.setCacheEnabled(false);
}

export async function clearCookie(page: Page) {
	await page.evaluate(() => {
		document.cookie.split(';').forEach((cookie) => {
			const name = cookie.split('=')[0].trim();
			document.cookie = `${name}=; expires=Thu, 02 Jan 2024 00:00:00 UTC; path=/;`;
		});
	});
}

export async function clearLocalStorage(page: Page) {
	await page.evaluate(() => {
		localStorage.clear();
	});
}

export async function safeClosePage(page: Page | null | undefined) {
	if (!page) return;

	let url = 'about:blank';
	try {
		url = page.url();
	} catch {
		/* ignore */
	}

	try {
		if (typeof (page as any).isClosed === 'function' && page.isClosed()) {
			return;
		}
	} catch {
		/* ignore */
	}

	let isBrowserConnected = true;
	try {
		const browser = page.browser?.();
		if (browser) {
			if ('connected' in browser) {
				isBrowserConnected = (browser as any).connected as boolean;
			} else if (typeof (browser as any).isConnected === 'function') {
				isBrowserConnected = (browser as any).isConnected() as boolean;
			}
		}
	} catch {
		/* ignore */
	}

	if (!isBrowserConnected) {
		return;
	}

	try {
		await page.close();
	} catch (err) {
		const msg = String(err);
		if (
			/Target\.closeTarget/.test(msg) ||
			/Session closed/.test(msg) ||
			/Target closed/.test(msg) ||
			/Browser has been closed/.test(msg) ||
			/WebSocket is not open/.test(msg) ||
			/Connection closed/.test(msg)
		) {
			return;
		}
		throw err;
	}
}
