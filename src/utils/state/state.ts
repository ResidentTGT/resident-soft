import { LocalStorage } from 'node-localstorage';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Function that merges old and new state instances.
 */
export type MergeFn<T extends object> = (oldState: T | null, newState: T) => T;

/**
 * State wrapper returned by {@link StateStorage.load}.
 * Adds a `save()` method while preserving the original model shape.
 */
export type State<T extends object> = Omit<T, 'save'> & {
	/**
	 * Persist current state to disk.
	 * @param merge  Optional merge strategy.
	 * @param options  Per‑call overrides (rootDir, fileExt, etc.).
	 */
	save: (merge?: MergeFn<T>, options?: Partial<SaveOptions<T>>) => void;
};

/** Base options shared by load/save helpers. */
export interface StorageOptions {
	/** Directory where state files live. */
	rootDir?: string;
	/** Custom extension (e.g. ".json"). */
	fileExt?: string;
	/** Pretty‑print JSON for human readability. */
	readable?: boolean;
	/** LocalStorage quota in bytes (default 25MB). */
	quota?: number;
}

export type LoadOptions<T extends object> = StorageOptions & { defaultState?: T };
export type SaveOptions<T extends object> = StorageOptions & { merge?: MergeFn<T> };

/**
 * Simple JSON‑on‑disk key/value storage with typed helpers.
 */
export class StateStorage {
	public static readonly DefaultDir = './states';
	public static readonly DefaultExt = '.json';
	private static readonly DefaultQuota = 25 * 1024 * 1024; // 25MB

	/**
	 * Load (or create) a state model and return it with an attached `save()` helper.
	 */
	public static load<T extends object>(name: string, options: LoadOptions<T> = {}): State<T> {
		const storage = this.initStorage(name, options);
		const key = this.getKey(name, options);
		const defaultState = options.defaultState ?? ({} as T);

		// Deep‑copy defaultState so we never mutate caller‑provided object.
		const data = this.loadState<T>(storage, key, defaultState);

		// Создаём state отдельно, чтобы не сослаться на переменную до инициализации.
		const state = Object.assign({} as State<T>, data) as State<T>;

		state.save = (merge?: MergeFn<T>, opt: Partial<SaveOptions<T>> = {}) =>
			this.save<T>(name, state, { ...options, ...opt, merge });

		return state;
	}

	/**
	 * Save arbitrary data (not necessarily produced by `load()`).
	 * Теперь принимает либо чистое состояние T, либо State<T> (с методом save).
	 */
	public static save<T extends object>(name: string, state: T | State<T>, options: SaveOptions<T> = {}): void {
		const storage = this.initStorage(name, options);
		const key = this.getKey(name, options);

		// Снимем runtime‑поля (например, save) перед записью.
		const plain = this.toPlain<T>(state as T | State<T>);

		this.saveState(storage, key, plain as T, options.merge, options.readable);
	}

	/* ─────────────────────────── internal helpers ─────────────────────────── */

	private static getKey(name: string, options: StorageOptions = {}): string {
		const ext = options.fileExt ?? this.DefaultExt;
		const base = path.basename(name, ext); // избегаем двойных расширений
		return `${base}${ext}`;
	}

	private static initStorage(name: string, options: StorageOptions = {}): LocalStorage {
		const root = options.rootDir ?? this.DefaultDir;
		const dir = path.join(root, this.nameToDir(name));

		// Ensure directory exists (recursive = true is available since Nodev10).
		fs.mkdirSync(dir, { recursive: true });

		return new LocalStorage(dir, options.quota ?? this.DefaultQuota);
	}

	private static loadState<T extends object>(storage: LocalStorage, key: string, defaultVal: T): T {
		const raw = storage.getItem(key);
		const parsed = this.safeParse<T>(raw);
		return parsed ? ({ ...defaultVal, ...parsed } as T) : ({ ...defaultVal } as T);
	}

	private static saveState<T extends object>(
		storage: LocalStorage,
		key: string,
		state: T,
		merge?: MergeFn<T>,
		readable?: boolean,
	): void {
		const merged = merge ? merge(this.loadState(storage, key, {} as T), state) : state;
		// merged уже "plain" (см. вызов выше), так что сериализуем напрямую
		storage.setItem(key, JSON.stringify(merged, null, readable ? 2 : undefined));
	}

	private static safeParse<T>(raw: string | null): T | null {
		if (!raw) return null;
		try {
			return JSON.parse(raw) as T;
		} catch {
			console.error('[StateStorage] Corrupted JSON, ignoring stored state.');
			return null;
		}
	}

	/** Remove runtime helpers (e.g. `save`) before serialisation. */
	private static toPlain<T extends object>(state: T | State<T>): T {
		if (state && typeof state === 'object') {
			const { save, ...rest } = state as any;
			return rest as T;
		}
		return state as T;
	}

	private static nameToDir(name: string): string {
		const dir = path.dirname(name);
		return dir === '.' ? '' : dir;
	}
}

export default StateStorage;
