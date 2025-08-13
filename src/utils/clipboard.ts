import { ElementHandle, Page } from 'puppeteer-core';
import cp from 'copy-paste';

export async function paste(page: Page, selector: string | ElementHandle, text: string) {
	// TODO: Add FS lock:
	// Сделать в temp-dir файл и лочится об него на время выполнения функции

	await new Promise<void>((res, rej) => cp.copy(text, (err) => (err ? rej(err) : res())));

	if (typeof selector == 'string') await page.focus(selector);
	else await selector.focus();

	await page.keyboard.down('Control');
	await page.keyboard.press('V');
	await page.keyboard.up('Control');
}

export async function copy(text: string) {
	return await new Promise<void>((res, rej) => cp.copy(text, (err) => (err ? rej(err) : res())));
}
