import type { Request, Response } from 'express';
import { MessageType } from '../logger';
import { getAllTasks } from '../taskManager';
import { type EventName } from './eventName.type';

export interface SSEMessage<T = unknown> {
	eventName: EventName;
	taskId?: number;
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

const seqByTask = new Map<number, number>();
function nextSeq(taskId?: number) {
	const key = taskId ?? 0;
	const n = (seqByTask.get(key) ?? 0) + 1;
	seqByTask.set(key, n);
	return n;
}

export function broadcast<T = unknown>(msg: {
	eventName: EventName;
	payload?: T;
	type?: MessageType;
	taskId?: number;
	sequence?: number;
}) {
	const finalMsg: SSEMessage<T> = {
		timestamp: nowIso(),
		sequence: msg.sequence ?? nextSeq(msg.taskId),
		eventName: msg.eventName,
		taskId: msg.taskId,
		type: msg.type,
		payload: msg.payload,
	};
	sseHub.sendJSON(finalMsg);
}

export function eventsHandler(req: Request, res: Response) {
	res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	(res as any).flushHeaders?.();

	for (const t of getAllTasks()) {
		const group = (t.launchParams as any)?.ACTION_PARAMS?.group;
		const action = (t.launchParams as any)?.ACTION_PARAMS?.action;
		sseHub.sendJSON({
			eventName: 'task_started',
			timestamp: nowIso(),
			taskId: t.id,
			type: MessageType.Notice,
			payload: { group, action },
		});
	}

	sseHub.add(res);
	req.on('close', () => sseHub.remove(res));
}
