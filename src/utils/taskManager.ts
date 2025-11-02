import { AsyncLocalStorage } from 'async_hooks';
import fs from 'fs';
import path from 'path';
import { broadcast } from './server/sse';
import { MessageType, PURPLE_TEXT, RESET } from './logger';
import { LaunchParams } from './types/launchParams.type';
import { FunctionParams } from './types/functionParams.type';

export type TaskStatus = 'running' | 'finished' | 'failed';

export interface TaskLog {
	ts: number;
	type: MessageType;
	message: string;
}

export interface Task {
	id: number;
	launchParams: LaunchParams;
	functionParams: FunctionParams;
	startTimestamp: number;
	finishTimestamp?: number;
	status: TaskStatus;
	error?: string;
	success: string[];
	fails: string[];
	logs: TaskLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TASKS_PATH = path.join(DATA_DIR, 'tasks.json');
const TMP_PATH = path.join(DATA_DIR, 'tasks.json.tmp');

let tasksFile: Task[] = [];
const tasksById = new Map<number, Task>();

let writeInFlight: Promise<void> | null = null;
let writeQueued = false;
let lastIssuedId = 0;

function ensureDirSync(dir: string) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFromDisk() {
	ensureDirSync(DATA_DIR);
	try {
		const raw = fs.readFileSync(TASKS_PATH, 'utf-8');
		const arr = JSON.parse(raw);
		if (Array.isArray(arr)) tasksFile = arr as Task[];
		else tasksFile = [];
	} catch (e) {
		tasksFile = [];
		fs.writeFileSync(TASKS_PATH, '[]', 'utf-8');
	}

	tasksById.clear();
	let max = 0;
	for (const t of tasksFile) {
		tasksById.set(t.id, t);
		if (t.id > max) max = t.id;
	}

	lastIssuedId = Math.max(lastIssuedId, max);
}

async function flushWriteOnce() {
	const snapshot = JSON.stringify(tasksFile, null, 2);
	try {
		fs.writeFileSync(TMP_PATH, snapshot, 'utf-8');
		fs.renameSync(TMP_PATH, TASKS_PATH);
	} catch {
		fs.writeFileSync(TASKS_PATH, snapshot, 'utf-8');
	}
}

function enqueueWrite() {
	if (writeInFlight) {
		writeQueued = true;
		return writeInFlight;
	}
	writeInFlight = (async () => {
		try {
			await flushWriteOnce();

			while (writeQueued) {
				writeQueued = false;
				await flushWriteOnce();
			}
		} finally {
			writeInFlight = null;
		}
	})();
	return writeInFlight;
}

function safeClone<T>(v: T): T {
	return JSON.parse(JSON.stringify(v));
}

interface Store {
	taskId?: number;
}
const als = new AsyncLocalStorage<Store>();

export function withTaskContext<T>(taskId: number, fn: () => Promise<T> | T): Promise<T> | T {
	return als.run({ taskId }, fn);
}

export function getCurrentTaskId(): number | undefined {
	return als.getStore()?.taskId;
}

export function startTask(launchParams: LaunchParams, functionParams: FunctionParams): number {
	const now = Date.now();

	const id = Number(`${now}${(++lastIssuedId % 1e3).toString().padStart(3, '0')}`);

	const t: Task = {
		id,
		launchParams: safeClone(launchParams),
		functionParams: safeClone(functionParams),
		startTimestamp: now,
		status: 'running',
		success: [],
		fails: [],
		logs: [],
	};

	tasksFile.push(t);
	tasksById.set(id, t);
	enqueueWrite();
	console.log(
		`${PURPLE_TEXT}Task ${id} (${launchParams.ACTION_PARAMS.group} - ${launchParams.ACTION_PARAMS.action}) started.\n${RESET}`,
	);
	broadcast({ eventName: 'task_started', taskId: id, type: MessageType.Notice, payload: serializeTask(t) });

	return id;
}

export function finishTask(id: number): void {
	const t = tasksById.get(id);
	if (!t) return;
	if (t.status !== 'running') return;
	t.status = 'finished';
	t.finishTimestamp = Date.now();
	enqueueWrite();
	console.log(
		`${PURPLE_TEXT}Task ${id} (${t.launchParams.ACTION_PARAMS.group} - ${t.launchParams.ACTION_PARAMS.action}) finished.\n${RESET}`,
	);
	broadcast({ eventName: 'task_finished', taskId: id, type: MessageType.Notice, payload: serializeTask(t) });
}

export function failTask(id: number, error: string): void {
	const t = tasksById.get(id);
	if (!t) return;
	if (t.status !== 'running') return;
	t.status = 'failed';
	t.error = error;
	t.finishTimestamp = Date.now();
	enqueueWrite();
	console.log(
		`${PURPLE_TEXT}Task ${id} (${t.launchParams.ACTION_PARAMS.group} - ${t.launchParams.ACTION_PARAMS.action}) failed.\n${RESET}`,
	);
	broadcast({ eventName: 'task_failed', taskId: id, type: MessageType.Error, payload: serializeTask(t) });
}

export function appendTaskLog(id: number, message: string, level = MessageType.Trace): void {
	const t = tasksById.get(id);
	if (!t) return;
	t.logs.push({ ts: Date.now(), type: level, message });

	if (t.logs.length > 5000) t.logs.splice(0, t.logs.length - 5000);
	enqueueWrite();
	broadcast({ eventName: 'log', type: level, taskId: id, payload: { id, entry: t.logs[t.logs.length - 1] } });
}

export function recordSuccess(id: number, account: string): void {
	const t = tasksById.get(id);
	if (!t) return;
	t.success.push(account);
	enqueueWrite();
}

export function recordFail(id: number, account: string): void {
	const t = tasksById.get(id);
	if (!t) return;
	t.fails.push(account);
	enqueueWrite();
}

export function getTask(id: number): Task | undefined {
	const t = tasksById.get(id);
	return t ? safeClone(t) : undefined;
}

export function getAllTasks(): Task[] {
	return safeClone(tasksFile);
}

function serializeTask(t: Task) {
	return safeClone({ ...t });
}

loadFromDisk();
