import { Router } from 'express';
import { eventsHandler } from '../sse';

const router = Router();

router.get('/', eventsHandler);

export default router;
