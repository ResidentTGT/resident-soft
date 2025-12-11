import type { Request, Response } from 'express';
import { MessageType } from '../logger';
import { type EventName } from './eventName.type';

export interface SSEMessage<T = unknown> {
	eventName: EventName;
	stateName?: string;
	type?: MessageType;
	timestamp: string;
	payload?: T;
	sequence?: number;
}

class SSEHub {
	private clients = new Set<Response>();

	add(res: Response) {
		this.clients.add(res);
	}
	remove(res: Response) {
		this.clients.delete(res);
	}

	sendJSON(message: SSEMessage) {
		const frame = `data: ${JSON.stringify(message)}\n\n`;
		for (const res of this.clients) {
			if (!res.writableEnded) res.write(frame);
		}
	}
}

export const sseHub = new SSEHub();

function nowIso() {
	return new Date().toISOString();
}

export function broadcast<T = unknown>(msg: Omit<SSEMessage<T>, 'timestamp' | 'sequence'> & { sequence?: number }) {
	const finalMsg: SSEMessage<T> = {
		timestamp: nowIso(),
		sequence: msg.sequence,
		...msg,
	};
	sseHub.sendJSON(finalMsg);
}

export function eventsHandler(req: Request, res: Response) {
	res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders?.();

	sseHub.add(res);
	req.on('close', () => sseHub.remove(res));
}
