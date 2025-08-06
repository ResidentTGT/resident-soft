// array-shuffle.ts
declare global {
	interface Array<T> {
		/**
		 * Returns a new array with the elements in random order
		 * (Fisher–Yates / Knuth shuffle).
		 */
		shuffle(this: T[]): T[];
	}
}

/**
 * Injects `shuffle` into `Array.prototype`.
 *  • marked non‑enumerable so it does not appear in `for…in`
 *  • writable / configurable for easy override or removal
 */
Object.defineProperty(Array.prototype, 'shuffle', {
	value: function <T>(this: T[]): T[] {
		// Work on a copy to avoid mutating the original array
		const result = [...this];

		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	},
	writable: true,
	configurable: true,
	enumerable: false,
});

export {}; // ensures the file is treated as a module
