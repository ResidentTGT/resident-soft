import { Random } from '@utils/random';
import { GhostCursor, createCursor, getRandomPagePoint } from 'ghost-cursor';
import { ElementHandle, Page } from 'puppeteer-core';

export abstract class Cursor {
	static async click(cursor: GhostCursor, element: ElementHandle<Element> | undefined) {
		if (element)
			await cursor.click(element, {
				moveDelay: 0,
				moveSpeed: Random.int(5000, 10000),
				maxTries: 1,
				waitForClick: Random.int(5, 20),
				paddingPercentage: Random.int(40, 60),
			});
	}
	static async get(page: Page, performRandomMoves = true): Promise<GhostCursor> {
		const cursor = await createCursor(page, await getRandomPagePoint(page), performRandomMoves);
		return cursor;
	}
}
