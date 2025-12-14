import { Router } from 'express';
import { readConfigs, writeConfigs } from '@utils/config-io';

const router = Router();

router.get('/', (_req, res) => {
	try {
		res.json(readConfigs());
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

router.post('/', (req, res) => {
	try {
		const { launchParams, functionParams } = req.body || {};
		writeConfigs(launchParams, functionParams);
		res.json({ ok: true });
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

export default router;
