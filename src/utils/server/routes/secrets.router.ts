import { Router } from 'express';
import express from 'express';
import path from 'path';
import fs from 'node:fs';
import { readJsonc } from '@utils/config-io';
import {
	ACCOUNTS_DECRYPTED_PATH,
	ACCOUNTS_ENCRYPTED_PATH,
	SECRET_STORAGE_DECRYPTED_PATH,
	SECRET_STORAGE_ENCRYPTED_PATH,
} from '@src/constants';
import {
	convertFromCsvToCsv,
	convertFromCsvToJsonAccounts,
	convertSecretStorage,
	saveJsonAccountsToCsv,
} from '@utils/workWithSecrets';
import type { AccountsFile } from '@utils/account';

const router = Router();

// Secret Storage endpoints
router.get('/storage', (_req, res) => {
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

router.post('/storage', (req, res) => {
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

router.post('/storage/encrypt', async (req, res) => {
	try {
		const { password } = req.body || {};
		convertSecretStorage(SECRET_STORAGE_ENCRYPTED_PATH, SECRET_STORAGE_DECRYPTED_PATH, password, true);
		res.json({ ok: true });
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

router.post('/storage/decrypt', async (req, res) => {
	try {
		const { password } = req.body || {};
		convertSecretStorage(SECRET_STORAGE_ENCRYPTED_PATH, SECRET_STORAGE_DECRYPTED_PATH, password, false);
		res.json({ ok: true });
	} catch (e: any) {
		if (e.message.toString().includes('invalid key')) res.status(403).json({ error: e.message });
		else res.status(500).json({ error: e.message });
	}
});

// Accounts endpoints
router.get('/accounts', async (_req, res) => {
	try {
		const encPath = ACCOUNTS_ENCRYPTED_PATH;
		const decPath = ACCOUNTS_DECRYPTED_PATH;

		const decryptedFiles = fs.existsSync(decPath) ? fs.readdirSync(decPath).filter((f) => f.endsWith('.xlsx')) : [];
		const encryptedFiles = fs.existsSync(encPath) ? fs.readdirSync(encPath).filter((f) => f.endsWith('.xlsx')) : [];

		const accsFiles: {
			encrypted: { fileName: string; accounts: any[] }[];
			decrypted: { fileName: string; accounts: any[] }[];
		} = {
			encrypted: [],
			decrypted: [],
		};

		for (const file of decryptedFiles) {
			const filePath = `${decPath}/${file}`;
			const accs = await convertFromCsvToJsonAccounts(filePath, false, false);
			accsFiles.decrypted.push({ fileName: file, accounts: accs });
		}

		for (const file of encryptedFiles) {
			const filePath = `${encPath}/${file}`;
			const accs = await convertFromCsvToJsonAccounts(filePath, false, false);
			accsFiles.encrypted.push({ fileName: file, accounts: accs });
		}

		res.json(accsFiles);
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

router.post('/accounts', express.text({ type: 'application/jsonl', limit: '50mb' }), async (req, res) => {
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

router.post('/accounts/create', express.json({ limit: '1mb' }), async (req, res) => {
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

router.post('/accounts/delete', async (req, res) => {
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

router.post('/accounts/deleteall', async (req, res) => {
	try {
		const { variant } = req.body as { variant: 'encrypted' | 'decrypted' };

		const root = variant === 'encrypted' ? ACCOUNTS_ENCRYPTED_PATH : ACCOUNTS_DECRYPTED_PATH;

		if (!fs.existsSync(root)) {
			return res.json({ ok: true, deleted: 0 });
		}

		const files = fs.readdirSync(root).filter((f) => f.endsWith('.xlsx'));
		let deleted = 0;

		for (const file of files) {
			const filePath = path.join(root, file);
			try {
				fs.unlinkSync(filePath);
				deleted++;
			} catch (e: any) {
				console.error(`Failed to delete ${file}:`, e.message);
			}
		}

		res.json({ ok: true, deleted });
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

router.post('/accounts/encrypt', async (req, res) => {
	try {
		const { password } = req.body || {};
		await convertFromCsvToCsv(ACCOUNTS_ENCRYPTED_PATH, ACCOUNTS_DECRYPTED_PATH, password, true);
		res.json({ ok: true });
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

router.post('/accounts/decrypt', async (req, res) => {
	try {
		const { password } = req.body || {};
		await convertFromCsvToCsv(ACCOUNTS_ENCRYPTED_PATH, ACCOUNTS_DECRYPTED_PATH, password, false);
		res.json({ ok: true });
	} catch (e: any) {
		if (e.message.toString().includes('invalid key')) res.status(403).json({ error: e.message });
		else res.status(500).json({ error: e.message });
	}
});

export default router;
