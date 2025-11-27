import { Router } from 'express';
import fs from 'node:fs';
import { ACCOUNTS_DECRYPTED_PATH, ACCOUNTS_ENCRYPTED_PATH } from '@src/constants';

const router = Router();

router.get('/', (_req, res) => {
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

export default router;
