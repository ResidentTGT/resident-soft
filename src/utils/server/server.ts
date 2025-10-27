import express from 'express';
import path from 'path';
import { readConfigs, readJsonc, writeConfigs } from '../config-io';
import * as sea from 'node:sea';
import fs from 'node:fs';

import { selectionGate } from '../selection';
import { ACTIONS } from '@src/actions';
import { Network } from '@src/utils/network';
import { StandardState } from '@src/utils/state/standardState.interface';
import {
	convertFromCsvToCsv,
	convertFromCsvToJsonAccounts,
	convertSecretStorage,
	saveJsonAccountsToCsv,
} from '../workWithSecrets';
import { Account } from '../account';
import type { AccountsFile } from '@utils/account';
import {
	ACCOUNTS_DECRYPTED_PATH,
	ACCOUNTS_ENCRYPTED_PATH,
	SECRET_STORAGE_DECRYPTED_PATH,
	SECRET_STORAGE_ENCRYPTED_PATH,
} from '@src/constants';
import { eventsHandler } from './sse';

export async function startHttpServer() {
	const app = express();
	app.use(express.json());

	app.get('/api/events', eventsHandler);

	app.get('/api/configs', (_req, res) => {
		try {
			res.json(readConfigs());
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

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
		const snapshot = readConfigs();
		const ok = selectionGate.choose(by, snapshot, req.body?.key);
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
			const decryptedPath = ACCOUNTS_DECRYPTED_PATH;
			const encryptedPath = ACCOUNTS_ENCRYPTED_PATH;
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
			const files = fs.existsSync(PROCESS_DIR)
				? (await fs.readdirSync(PROCESS_DIR)).filter((f) => f.endsWith('.json'))
				: [];

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

	app.get('/api/secrets/storage', (_req, res) => {
		try {
			const encPath = SECRET_STORAGE_ENCRYPTED_PATH;
			const decPath = SECRET_STORAGE_DECRYPTED_PATH;
			let encryptedData;
			let decryptedData;
			if (fs.existsSync(encPath)) encryptedData = readJsonc(encPath);
			if (fs.existsSync(decPath)) decryptedData = readJsonc(decPath);

			res.json({ encrypted: encryptedData, decrypted: decryptedData });
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.get('/api/secrets/accounts', async (_req, res) => {
		try {
			const encPath = ACCOUNTS_ENCRYPTED_PATH;
			const decPath = ACCOUNTS_DECRYPTED_PATH;

			const decryptedFiles = fs.existsSync(decPath) ? fs.readdirSync(decPath).filter((f) => f.endsWith('.xlsx')) : [];
			const encryptedFiles = fs.existsSync(encPath) ? fs.readdirSync(encPath).filter((f) => f.endsWith('.xlsx')) : [];

			const accsFiles: {
				encrypted: { fileName: string; accounts: Account[] }[];
				decrypted: { fileName: string; accounts: Account[] }[];
			} = {
				encrypted: [],
				decrypted: [],
			};

			for (const file of decryptedFiles) {
				const path = `${decPath}/${file}`;
				const accs = await convertFromCsvToJsonAccounts(path, false, false);
				accsFiles.decrypted.push({ fileName: file, accounts: accs });
			}

			for (const file of encryptedFiles) {
				const path = `${encPath}/${file}`;
				const accs = await convertFromCsvToJsonAccounts(path, false, false);
				accsFiles.encrypted.push({ fileName: file, accounts: accs });
			}

			res.json(accsFiles);
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.post('/api/secrets/storage', (req, res) => {
		if (selectionGate.getStatus().chosenBy) {
			return res.status(423).json({ error: 'Configs are locked (already chosen)' });
		}
		try {
			const { encrypted, decrypted } = req.body || {};

			const encPath = SECRET_STORAGE_ENCRYPTED_PATH;
			const decPath = SECRET_STORAGE_DECRYPTED_PATH;
			if (encrypted !== undefined) {
				fs.mkdirSync(path.dirname(encPath), { recursive: true });
				fs.writeFileSync(encPath, JSON.stringify(encrypted, null, '\t'));
			}
			if (decrypted !== undefined) {
				fs.mkdirSync(path.dirname(decPath), { recursive: true });
				fs.writeFileSync(decPath, JSON.stringify(decrypted, null, '\t'));
			}
			res.json({ ok: true });
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.post('/api/secrets/accounts', express.text({ type: 'application/jsonl', limit: '50mb' }), async (req, res) => {
		if (selectionGate.getStatus().chosenBy) {
			return res.status(423).json({ error: 'Configs are locked (already chosen)' });
		}
		try {
			const { encrypted: encryptedFiles, decrypted: decryptedFiles } = JSON.parse(req.body) as {
				encrypted: AccountsFile[];
				decrypted: AccountsFile[];
			};

			const encPath = ACCOUNTS_ENCRYPTED_PATH;
			const decPath = ACCOUNTS_DECRYPTED_PATH;

			if (encryptedFiles.length > 0) {
				for (const accsFile of encryptedFiles) {
					fs.mkdirSync(encPath, { recursive: true });
					await saveJsonAccountsToCsv(`${encPath}/${accsFile.fileName}`, accsFile.accounts, false);
				}
			}

			if (decryptedFiles.length > 0) {
				for (const accsFile of decryptedFiles) {
					fs.mkdirSync(decPath, { recursive: true });
					await saveJsonAccountsToCsv(`${decPath}/${accsFile.fileName}`, accsFile.accounts, false);
				}
			}

			res.json({ ok: true });
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.post('/api/secrets/accounts/create', express.json({ limit: '1mb' }), async (req, res) => {
		try {
			const { variant, fileName } = req.body as { variant: 'encrypted' | 'decrypted'; fileName: string };

			const root = variant === 'encrypted' ? ACCOUNTS_ENCRYPTED_PATH : ACCOUNTS_DECRYPTED_PATH;

			fs.mkdirSync(root, { recursive: true });

			function safeCsvName(name: string) {
				const base = path.basename(name).trim();
				if (!base) throw new Error('Empty fileName');
				const norm = base.toLowerCase().endsWith('.xlsx') ? base : `${base}.xlsx`;
				if (norm.includes('..') || norm.includes('/') || norm.includes('\\')) throw new Error('Invalid fileName');
				return norm;
			}

			const safeName = safeCsvName(fileName);
			const full = path.join(root, safeName);

			if (fs.existsSync(full)) {
				return res.status(409).json({ error: 'File already exists' });
			}

			await saveJsonAccountsToCsv(full, [], false);

			res.json({ ok: true });
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.post('/api/secrets/accounts/delete', async (req, res) => {
		try {
			const { variant, fileName } = req.body as { variant: 'encrypted' | 'decrypted'; fileName: string };

			const root = variant === 'encrypted' ? ACCOUNTS_ENCRYPTED_PATH : ACCOUNTS_DECRYPTED_PATH;

			const full = path.join(root, fileName);

			if (!fs.existsSync(full)) {
				return res.status(404).json({ error: 'File not found' });
			}

			fs.unlinkSync(full);
			res.json({ ok: true });
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.post('/api/secrets/accounts/encrypt', async (req, res) => {
		try {
			const { password } = req.body || {};
			await convertFromCsvToCsv(ACCOUNTS_ENCRYPTED_PATH, ACCOUNTS_DECRYPTED_PATH, password, true);
			res.json({ ok: true });
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.post('/api/secrets/storage/encrypt', async (req, res) => {
		try {
			const { password } = req.body || {};
			convertSecretStorage(SECRET_STORAGE_ENCRYPTED_PATH, SECRET_STORAGE_DECRYPTED_PATH, password, true);
			res.json({ ok: true });
		} catch (e: any) {
			res.status(500).json({ error: e.message });
		}
	});

	app.post('/api/secrets/accounts/decrypt', async (req, res) => {
		try {
			const { password } = req.body || {};
			await convertFromCsvToCsv(ACCOUNTS_ENCRYPTED_PATH, ACCOUNTS_DECRYPTED_PATH, password, false);
			res.json({ ok: true });
		} catch (e: any) {
			if (e.message.toString().includes('invalid key')) res.status(403).json({ error: e.message });
			else res.status(500).json({ error: e.message });
		}
	});

	app.post('/api/secrets/storage/decrypt', async (req, res) => {
		try {
			const { password } = req.body || {};
			convertSecretStorage(SECRET_STORAGE_ENCRYPTED_PATH, SECRET_STORAGE_DECRYPTED_PATH, password, false);
			res.json({ ok: true });
		} catch (e: any) {
			if (e.message.toString().includes('invalid key')) res.status(403).json({ error: e.message });
			else res.status(500).json({ error: e.message });
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
