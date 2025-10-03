import express from 'express';
import path from 'path';
import { readConfigs, writeConfigs } from './config-io';
import * as sea from 'node:sea';
import fs from 'node:fs';

import { selectionGate } from './selection';
import { ACTIONS } from '@src/actions';
import { Network } from '@src/utils/network';
import { StandardState } from '@src/utils/state/standardState.interface';

export async function startHttpServer() {
	const app = express();
	app.use(express.json());

	// API: прочитать конфиги
	app.get('/api/configs', (_req, res) => {
		try {
			res.json(readConfigs());
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	// API: записать конфиги
	app.post('/api/configs', (req, res) => {
		if (selectionGate.getStatus().chosenBy) {
			return res.status(423).json({ error: 'Configs are locked (already chosen)' });
		}
		try {
			const { launchParams, functionParams } = req.body || {};
			writeConfigs(launchParams, functionParams);
			res.json({ ok: true });
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.get('/api/selection', (_req, res) => {
		res.json(selectionGate.getStatus());
	});

	app.post('/api/selection/choose', (req, res) => {
		const by = (req.body?.by as 'ui' | 'terminal') || 'ui';
		const snapshot = readConfigs(); // фиксируем текущие конфиги
		const ok = selectionGate.choose(by, snapshot);
		if (!ok) return res.status(409).json({ error: 'Already chosen', ...selectionGate.getStatus() });
		return res.json({ ok: true, ...selectionGate.getStatus() });
	});

	app.get('/api/actions', (_req, res) => {
		try {
			res.json(ACTIONS);
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.get('/api/networks', (_req, res) => {
		try {
			res.json(Network.getAllNetworksConfigs());
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.get('/api/tokens', (_req, res) => {
		try {
			res.json(Network.getAllTokensConfigs());
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.get('/api/accsfiles', (_req, res) => {
		try {
			const snapshot = readConfigs();
			const decryptedPath = snapshot.launchParams.ENCRYPTION.ACCOUNTS_DECRYPTED_PATH;
			const encryptedPath = snapshot.launchParams.ENCRYPTION.ACCOUNTS_ENCRYPTED_PATH;
			const decryptedfiles = fs.existsSync(decryptedPath)
				? fs.readdirSync(decryptedPath).map((a) => a.replaceAll('.xlsx', ''))
				: [];
			const encryptedfiles = fs.existsSync(encryptedPath)
				? fs.readdirSync(encryptedPath).map((a) => a.replaceAll('.xlsx', ''))
				: [];
			res.json([...new Set([...decryptedfiles, ...encryptedfiles])]);
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.get('/api/process/states', async (_req, res) => {
		try {
			const PROCESS_DIR = path.resolve(process.cwd(), 'states');
			const files = (await fs.readdirSync(PROCESS_DIR)).filter((f) => f.endsWith('.json'));

			const ok: { name: string; updatedAt: string; data: StandardState }[] = [];
			const failed: { name: string; error?: string }[] = [];

			for (const f of files) {
				const name = path.basename(f, '.json'); // сохраняем пробелы и т.п.
				const filePath = path.join(PROCESS_DIR, f);
				try {
					const raw = await fs.readFileSync(filePath, 'utf8');
					const json = JSON.parse(raw) as unknown;

					if (typeof json !== 'object' || json === null) {
						failed.push({ name, error: 'Bad JSON root' });
						continue;
					}
					const isStringArray = (v: unknown): v is string[] =>
						Array.isArray(v) && v.every((x) => typeof x === 'string');
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

	// Раздача UI: SEA или с диска
	const isSea = typeof sea.isSea === 'function' && sea.isSea();
	if (isSea) {
		const uiDir = path.resolve(process.cwd(), 'frontend', 'dist');

		if (!fs.existsSync(path.join(uiDir, 'index.html'))) {
			console.warn('[UI] frontend/dist не найден. Запусти:  npm run build  в папке фронта');
		}

		app.use(
			express.static(uiDir, {
				index: false,
				setHeaders(res, filePath) {
					if (filePath.endsWith('.mjs') || filePath.endsWith('.js')) {
						res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
					} else if (filePath.endsWith('.css')) {
						res.setHeader('Content-Type', 'text/css; charset=utf-8');
					}
					if (filePath.includes(`${path.sep}assets${path.sep}`) || /\.[a-f0-9]{8,}\./i.test(filePath)) {
						res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
					} else {
						res.setHeader('Cache-Control', 'no-cache');
					}
				},
			}),
		);

		app.get(/^\/(?!api\/).*/, (_req, res) => {
			res.sendFile(path.join(uiDir, 'index.html'));
		});
	}

	const port = process.env.PORT ? Number(process.env.PORT) : 3000;
	return new Promise<void>((resolve) => {
		app.listen(port, () => {
			resolve();
		});
	});
}
