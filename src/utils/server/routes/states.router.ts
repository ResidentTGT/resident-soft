import { Router } from 'express';
import path from 'path';
import fs from 'node:fs';
import { StandardState, StandardStateStatus } from '@utils/state/standardState.interface';

const router = Router();

router.get('/', async (_req, res) => {
	try {
		const PROCESS_DIR = path.resolve(process.cwd(), 'states');
		const files = fs.existsSync(PROCESS_DIR) ? (await fs.readdirSync(PROCESS_DIR)).filter((f) => f.endsWith('.json')) : [];

		const ok: { name: string; updatedAt: string; data: StandardState }[] = [];
		const failed: { name: string; error?: string }[] = [];

		for (const f of files) {
			// Decode URL-encoded filename (node-localstorage encodes Cyrillic/special chars)
			const name = decodeURIComponent(path.basename(f, '.json'));
			const filePath = path.join(PROCESS_DIR, f);
			try {
				const raw = await fs.readFileSync(filePath, 'utf8');
				const json = JSON.parse(raw) as unknown;

				if (typeof json !== 'object' || json === null) {
					failed.push({ name, error: 'Bad JSON root' });
					continue;
				}
				const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
				const o = json as Record<string, unknown>;
				if (!isStringArray(o.successes) || !isStringArray(o.fails)) {
					failed.push({ name, error: 'Invalid schema' });
					continue;
				}

				const uniq = (arr: string[]) => Array.from(new Set(arr)).sort();

				let status = StandardStateStatus.Idle;
				if (typeof o.status === 'number' && Object.values(StandardStateStatus).includes(o.status)) {
					status = o.status as StandardStateStatus;
				}

				const data: StandardState = {
					successes: uniq(o.successes),
					fails: uniq(o.fails),
					info: typeof o.info === 'string' ? o.info : '',
					status,
				};

				const stat = await fs.statSync(filePath);
				ok.push({ name, updatedAt: stat.mtime.toISOString(), data });
			} catch (e: any) {
				failed.push({ name, error: e?.message });
			}
		}

		res.json({ states: ok, failed });
	} catch (e: any) {
		res.status(500).json({ error: 'Failed to list states', details: e?.message });
	}
});

router.post('/delete', async (req, res) => {
	try {
		const { fileNames } = req.body as { fileNames: string[] };

		// Validation
		if (!Array.isArray(fileNames) || fileNames.length === 0) {
			return res.status(400).json({ error: 'fileNames must be a non-empty array' });
		}

		const PROCESS_DIR = path.resolve(process.cwd(), 'states');
		const results: { fileName: string; success: boolean; error?: string }[] = [];
		let allSucceeded = true;

		// Get all files in directory
		const allFiles = fs.existsSync(PROCESS_DIR) ? fs.readdirSync(PROCESS_DIR).filter((f) => f.endsWith('.json')) : [];

		for (const fileName of fileNames) {
			try {
				// Validation
				if (!fileName || !fileName.trim()) {
					results.push({ fileName, success: false, error: 'fileName is empty' });
					allSucceeded = false;
					continue;
				}

				// Security: prevent path traversal
				const safeName = path.basename(fileName);
				if (safeName !== fileName || !safeName.endsWith('.json')) {
					results.push({ fileName, success: false, error: 'Invalid fileName format' });
					allSucceeded = false;
					continue;
				}

				// Extract name without extension
				const nameWithoutExt = path.basename(safeName, '.json');

				// Find the actual file on disk by decoding all file names
				let actualFileName: string | null = null;
				for (const diskFile of allFiles) {
					const decodedName = decodeURIComponent(path.basename(diskFile, '.json'));
					if (decodedName === nameWithoutExt) {
						actualFileName = diskFile;
						break;
					}
				}

				if (!actualFileName) {
					results.push({ fileName, success: false, error: 'State file not found' });
					allSucceeded = false;
					continue;
				}

				const filePath = path.join(PROCESS_DIR, actualFileName);
				fs.unlinkSync(filePath);
				results.push({ fileName, success: true });
			} catch (e: any) {
				results.push({ fileName, success: false, error: e?.message || 'Unknown error' });
				allSucceeded = false;
			}
		}

		res.json({ ok: allSucceeded, results });
	} catch (e: any) {
		res.status(500).json({ error: 'Failed to delete states', details: e?.message });
	}
});

export default router;
