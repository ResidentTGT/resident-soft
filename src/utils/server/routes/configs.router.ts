import { Router } from 'express';
import { readConfigs, writeConfigs } from '@utils/config-io';
import { selectionGate } from '@utils/selection';

const router = Router();

router.get('/', (_req, res) => {
	try {
		res.json(readConfigs());
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

router.post('/', (req, res) => {
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

export default router;
