export function delay(seconds: number): Promise<void> {
	return new Promise((r) => setTimeout(r, seconds * 1000));
}

export function delayMs(time: number): Promise<void> {
	return new Promise((r) => setTimeout(r, time));
}
