import { delay } from '@utils/delay';
import { Logger } from '@utils/logger';

export async function waitTime(time: number, delayInS = 1) {
	const settings = {
		dateStyle: 'short',
		timeStyle: 'medium',
		timeZone: 'Europe/Moscow',
	};

	let exactTime;
	while (!exactTime) {
		const now = Date.now();

		if (time <= now) {
			exactTime = true;
		} else {
			const fulltime = new Intl.DateTimeFormat('ru-RU', settings as any).format(now);
			await Logger.getInstance().log(
				`Time: ${fulltime} Waiting for ${new Intl.DateTimeFormat('ru-RU', settings as any).format(time)} ...`,
			);
			await delay(delayInS);
		}
	}
}
