import { Router } from 'express';
import { readConfigs } from '@utils/config-io';
import { selectionGate } from '@utils/selection';

const router = Router();

router.get('/', (_req, res) => {
	res.json(selectionGate.getStatus());
});

router.post('/choose', (req, res) => {
	const by = (req.body?.by as 'ui' | 'terminal') || 'ui';
	const snapshot = readConfigs();
	const ok = selectionGate.choose(by, snapshot, req.body?.key);
	if (!ok) return res.status(409).json({ error: 'Already chosen', ...selectionGate.getStatus() });
	return res.json({ ok: true, ...selectionGate.getStatus() });
});

export default router;
