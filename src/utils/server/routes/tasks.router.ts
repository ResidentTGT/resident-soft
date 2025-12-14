import { Router } from 'express';
import { activeTasksTracker } from '@utils/activeTasks';
import { readConfigs } from '@utils/config-io';
import { executeTask } from '@utils/taskExecutor';

const router = Router();

/**
 * GET /api/tasks/active
 */
router.get('/active', (_req, res) => {
	const activeTasks = activeTasksTracker.getActiveTasks();

	res.json({
		count: activeTasks.length,
		tasks: activeTasks,
	});
});

/**
 * POST /api/tasks/start
 */
router.post('/start', async (req, res) => {
	try {
		const { key } = req.body;
		const { launchParams, functionParams } = readConfigs();

		if (!launchParams || !functionParams) {
			return res.status(400).json({ error: 'Invalid configuration: missing params' });
		}

		if (!launchParams.ACTION_PARAMS?.group || !launchParams.ACTION_PARAMS?.action) {
			return res.status(400).json({ error: 'Invalid configuration: missing ACTION_PARAMS' });
		}

		const stateName = await executeTask(launchParams, functionParams, key);

		res.json({
			ok: true,
			stateName,
		});
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/tasks/:stateName/cancel - отмена задачи
 */
router.post('/:stateName/cancel', (req, res) => {
	const { stateName } = req.params;

	if (!stateName) {
		return res.status(400).json({ error: 'stateName is required' });
	}

	const success = activeTasksTracker.cancelTask(stateName);

	if (!success) {
		return res.status(400).json({ error: 'Cannot cancel task (not found or already finished)' });
	}

	res.json({ ok: true });
});

export default router;
