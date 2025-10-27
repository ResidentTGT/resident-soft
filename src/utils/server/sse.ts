import type { Request, Response } from 'express';

class SSEHub {
	private clients = new Set<Response>();

	add(res: Response) {
		this.clients.add(res);
	}
	remove(res: Response) {
		this.clients.delete(res);
	}

	send(type: string, data?: any) {
		const payload = `event: ${type}\n` + (data !== undefined ? `data: ${JSON.stringify(data)}\n` : '') + `\n`;
		for (const res of this.clients) {
			if (!res.writableEnded) res.write(payload);
		}
	}
}

export const sseHub = new SSEHub();

export function eventsHandler(_req: Request, res: Response) {
	res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');

	res.flushHeaders?.();
	res.write(': connected\n\n');
	sseHub.add(res);
	_req.on('close', () => sseHub.remove(res));
}

export function broadcastStatus(type: 'run_started' | 'decrypt_error' | 'run_finished' | 'run_failed', data?: any) {
	sseHub.send(type, data);
}
