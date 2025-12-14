import express from 'express';
import path from 'path';
import * as sea from 'node:sea';
import fs from 'node:fs';

import configsRouter from './routes/configs.router';
import tasksRouter from './routes/tasks.router';
import metadataRouter from './routes/metadata.router';
import accountsRouter from './routes/accounts.router';
import statesRouter from './routes/states.router';
import secretsRouter from './routes/secrets.router';
import eventsRouter from './routes/events.router';

let httpServer: ReturnType<typeof express.application.listen> | null = null;

export async function startHttpServer() {
	const app = express();
	app.use(express.json());

	// API Routes
	app.use('/api/events', eventsRouter);
	app.use('/api/configs', configsRouter);
	app.use('/api/tasks', tasksRouter);
	app.use('/api', metadataRouter);
	app.use('/api/accsfiles', accountsRouter);
	app.use('/api/process/states', statesRouter);
	app.use('/api/secrets', secretsRouter);

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
		httpServer = app.listen(port, () => {
			resolve();
		});
	});
}

export async function stopHttpServer(): Promise<void> {
	if (!httpServer) return;

	const server = httpServer;
	return new Promise<void>((resolve, reject) => {
		server.close((err) => {
			if (err) reject(err);
			else {
				httpServer = null;
				resolve();
			}
		});
	});
}
