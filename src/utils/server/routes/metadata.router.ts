import { Router } from 'express';
import { ACTIONS } from '@src/actions';
import { Network } from '@utils/network';

const router = Router();

router.get('/actions', (_req, res) => {
	try {
		res.json(ACTIONS);
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

router.get('/networks', (_req, res) => {
	try {
		res.json(Network.getAllNetworksConfigs());
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

router.get('/tokens', (_req, res) => {
	try {
		res.json(Network.getAllTokensConfigs());
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

export default router;
