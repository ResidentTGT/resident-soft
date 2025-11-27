import { Router } from 'express';
import path from 'path';
import fs from 'node:fs';
import { StandardState } from '@utils/state/standardState.interface';

const router = Router();

router.get('/', async (_req, res) => {
	try {
		const PROCESS_DIR = path.resolve(process.cwd(), 'states');
		const files = fs.existsSync(PROCESS_DIR) ? (await fs.readdirSync(PROCESS_DIR)).filter((f) => f.endsWith('.json')) : [];

		const ok: { name: string; updatedAt: string; data: StandardState }[] = [];
		const failed: { name: string; error?: string }[] = [];

		for (const f of files) {
			const name = path.basename(f, '.json');
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
				const data: StandardState = {
					successes: uniq(o.successes),
					fails: uniq(o.fails),
					info: typeof o.info === 'string' ? o.info : '',
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

export default router;
