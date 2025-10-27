import { AsyncLocalStorage } from 'async_hooks';
import { broadcast } from './server/sse';
import { MessageType } from './logger';

const taskStore = new AsyncLocalStorage<number>();
export function getCurrentTaskId(): number | undefined {
	return taskStore.getStore();
}
export async function withTaskContext<T>(id: number, fn: () => Promise<T>): Promise<T> {
	return taskStore.run(id, fn);
}

let lastTaskId = 0;
const taskSeq = new Map<number, number>();
interface TaskInfo {
	id: number;
	group: string;
	action: string;
}
export const tasks = new Map<number, TaskInfo>();

export function nextSeq(taskId?: number): number | undefined {
	if (taskId == null) return undefined;
	const prev = taskSeq.get(taskId) ?? 0;
	const cur = prev + 1;
	taskSeq.set(taskId, cur);
	return cur;
}

export function startTask(group: string, action: string): number {
	const id = ++lastTaskId;
	tasks.set(id, { id, group, action });
	taskSeq.set(id, 0);
	broadcast({
		eventName: 'run_started',
		taskId: id,
		type: MessageType.Notice,
		payload: { group, action },
	});
	return id;
}

export function finishTask(id: number, group: string, action: string) {
	broadcast({
		eventName: 'run_finished',
		taskId: id,
		type: MessageType.Notice,
		payload: { group, action },
	});
	tasks.delete(id);
	taskSeq.delete(id);
}

export function failTask(id: number, message: string, eventName: 'run_failed' | 'decrypt_error' = 'run_failed') {
	broadcast({
		eventName: eventName,
		taskId: id,
		type: MessageType.Error,
		payload: { message },
	});
	tasks.delete(id);
	taskSeq.delete(id);
}

export function allocateTaskId(): number {
	const id = ++lastTaskId;
	taskSeq.set(id, 0);
	return id;
}
