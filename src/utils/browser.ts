import { Browser, ElementHandle, Page } from 'rebrowser-puppeteer-core';
import { installMouseHelper } from 'ghost-cursor';

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
	await browser.pages().then((pages) => {
		const existedPages = pages.filter((p) => p.url().includes(url));
		if (existedPages.length) {
			for (const page of existedPages) {
				page.close();
			}
		}
	});

	const page = await browser.newPage();
	if (mouseHelper) await installMouseHelper(page);
	await page.goto(url, { timeout: 60_000 });

	return page;
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
