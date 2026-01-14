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

		for (const file of files) {
			// Decode URL-encoded filename (node-localstorage encodes Cyrillic/special chars)
			const name = path.basename(file, '.json');
			const filePath = path.join(PROCESS_DIR, file);
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
					displayName: typeof o.displayName === 'string' ? o.displayName : undefined,
					successes: uniq(o.successes),
					fails: uniq(o.fails),
					info: typeof o.info === 'string' ? o.info : '',
					status,
					createdAt: typeof o.createdAt === 'string' ? o.createdAt : undefined,
					launchParams:
						typeof o.launchParams === 'object' && o.launchParams !== null ? (o.launchParams as any) : undefined,
					actionFunctionParams:
						typeof o.actionFunctionParams === 'object' && o.actionFunctionParams !== null
							? (o.actionFunctionParams as any)
							: undefined,
				};

				const stat = await fs.statSync(filePath);

				ok.push({
					name,
					updatedAt: stat.mtime.toISOString(),
					data,
				});
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
					const decodedName = path.basename(diskFile, '.json');
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

				const LOG_DIR = path.join(PROCESS_DIR, 'logs');
				const logFilePath = path.join(LOG_DIR, `${nameWithoutExt}.jsonl`);
				if (fs.existsSync(logFilePath)) {
					try {
						fs.unlinkSync(logFilePath);
					} catch {
						//
					}
				}

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

router.get('/logs/:stateName', async (req, res) => {
	try {
		const { stateName } = req.params;

		if (!stateName || !stateName.trim()) {
			return res.status(400).json({ error: 'stateName is required' });
		}

		// Security: prevent path traversal
		const safeName = path.basename(stateName);
		if (safeName !== stateName) {
			return res.status(400).json({ error: 'Invalid stateName format' });
		}

		const LOG_DIR = path.resolve(process.cwd(), 'states', 'logs');
		const logFilePath = path.join(LOG_DIR, `${stateName}.jsonl`);

		if (!fs.existsSync(logFilePath)) {
			return res.json({ logs: [] });
		}

		const fileContent = fs.readFileSync(logFilePath, 'utf-8');
		const allLines = fileContent
			.trim()
			.split('\n')
			.filter((line) => line.trim());

		const lines = allLines.slice(-1000);

		const logs: { timestamp: string; type: number; message: string }[] = [];
		const failedLines: { lineNumber: number; error: string }[] = [];

		for (let i = 0; i < lines.length; i++) {
			try {
				const parsed = JSON.parse(lines[i]);

				if (
					typeof parsed.timestamp !== 'string' ||
					typeof parsed.type !== 'number' ||
					typeof parsed.message !== 'string'
				) {
					failedLines.push({ lineNumber: i + 1, error: 'Invalid log entry structure' });
					continue;
				}

				logs.push(parsed);
			} catch (e: any) {
				failedLines.push({ lineNumber: i + 1, error: e?.message || 'Parse error' });
			}
		}

		res.json({
			logs,
			totalCount: allLines.length,
			returnedCount: logs.length,
			limited: allLines.length > 1000,
			failed: failedLines.length > 0 ? failedLines : undefined,
		});
	} catch (e: any) {
		res.status(500).json({ error: 'Failed to read logs', details: e?.message });
	}
});

export default router;
