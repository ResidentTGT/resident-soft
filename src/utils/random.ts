import seedrandom, { PRNG } from 'seedrandom';

/**
 * Tiny yet handy wrapper around **`seedrandom`** that makes the most common
 * random‑number tasks trivial and type‑safe.
 *
 *  • {@link Random.float           float}  – **[from, to)**
 *  • {@link Random.int             int}    – **[from, to]** (inclusive)
 *  • {@link Random.choose          choose} – pick a random element from an array
 *  • {@link Random.of              of}     – pick a random element from arguments
 *
 * ```ts
 * // Non‑deterministic usage
 * const x = Random.float(0, 10);
 *
 * // Deterministic usage
 * const rnd = Random.bySeed('🎲');
 * const index = rnd.int(0, 9);
 * ```
 */
export class Random {
	private readonly rnd: PRNG;

	/**
	 * @param seedOrRng  – either a **seed string** for deterministic output or an
	 *                     existing `seedrandom` **PRNG** instance. Omit to get a
	 *                     non‑deterministic generator.
	 */
	constructor(seedOrRng?: string | PRNG) {
		if (typeof seedOrRng === 'string') {
			this.rnd = seedrandom(seedOrRng);
		} else if (typeof seedOrRng === 'function') {
			this.rnd = seedOrRng;
		} else {
			this.rnd = seedrandom();
		}
	}

	/**
	 * Returns a floating‑point number in the **half‑open interval [from,to)**.
	 */
	float(from: number, to: number): number {
		const [min, max] = from < to ? [from, to] : [to, from];
		return min + this.rnd.double() * (max - min);
	}

	/**
	 * Returns an **integer** in the **inclusive interval [from,to]**.
	 */
	int(from: number, to: number): number {
		const [min, max] = from < to ? [from, to] : [to, from];
		return min + Math.floor(this.rnd.double() * (max - min + 1));
	}

	/**
	 * Picks a random element from **`array`**.
	 * @throws `RangeError` if the array is empty.
	 */
	choose<T>(array: readonly T[]): T {
		if (array.length === 0) {
			throw new RangeError('Cannot choose from an empty array');
		}
		return array[this.int(0, array.length - 1)];
	}

	/** Sugar for {@link choose} that accepts arguments instead of an array. */
	of<T>(...values: readonly T[]): T {
		return this.choose(values);
	}

	/* -------------------------------------------------------------------- *
	 * 𝗦𝘁𝗮𝘁𝗶𝗰 𝗰𝗼𝗻𝘃𝗲𝗻𝗶𝗲𝗻𝗰𝗲 𝗺𝗲𝘁𝗵𝗼𝗱𝘀
	 * -------------------------------------------------------------------- */

	private static readonly _default = new Random();

	/** Non‑deterministic float in **[from,to)**. */
	static float(from: number, to: number): number {
		return Random._default.float(from, to);
	}

	/** Non‑deterministic integer in **[from,to]**. */
	static int(from: number, to: number): number {
		return Random._default.int(from, to);
	}

	/** Non‑deterministic element from `array`. */
	static choose<T>(array: readonly T[]): T {
		return Random._default.choose(array);
	}

	/** Non‑deterministic element from arguments. */
	static of<T>(...values: readonly T[]): T {
		return Random._default.of(...values);
	}

	/**
	 * Creates a **deterministic** generator backed by a seed string.
	 */
	static bySeed(seed: string): Random {
		return new Random(seed);
	}
}

export default Random;
