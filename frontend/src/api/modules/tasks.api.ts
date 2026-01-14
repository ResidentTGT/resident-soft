export interface StartTaskResponse {
	ok: boolean;
	stateName: string;
}

export interface ActiveTask {
	stateName: string;
	group: string;
	action: string;
	createdAt: string;
}

export interface ActiveTasksResponse {
	count: number;
	tasks: ActiveTask[];
}

/**
 * POST /api/tasks/start
 */
export async function startTask(key?: string): Promise<StartTaskResponse> {
	const r = await fetch('/api/tasks/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ key }),
	});

	if (!r.ok) {
		const text = await r.text();
		throw new Error(`Start task failed (${r.status}): ${text}`);
	}

	return r.json();
}

/**
 * GET /api/tasks/active
 */
export async function getActiveTasks(): Promise<ActiveTasksResponse> {
	const r = await fetch('/api/tasks/active');

	if (!r.ok) {
		const text = await r.text();
		throw new Error(`Get active tasks failed (${r.status}): ${text}`);
	}

	return r.json();
}

/**
 * POST /api/tasks/:stateName/cancel
 */
export async function cancelTask(stateName: string): Promise<{ ok: boolean }> {
	const r = await fetch(`/api/tasks/${stateName}/cancel`, {
		method: 'POST',
	});

	if (!r.ok) {
		const text = await r.text();
		throw new Error(`Cancel task failed (${r.status}): ${text}`);
	}

	return r.json();
}
