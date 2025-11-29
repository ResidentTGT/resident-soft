import type { StandardState } from '../../../../src/utils/state/standardState.interface';

export interface StatesIndexResp {
	states: { name: string; updatedAt: string; data: StandardState }[];
	failed?: { name: string; error?: string }[];
}

export async function getStates(signal?: AbortSignal): Promise<StatesIndexResp> {
	const r = await fetch('/api/process/states', { signal });
	if (!r.ok) {
		throw new Error(`${r.status} ${r.statusText}`);
	}
	return r.json();
}

export async function deleteState(fileName: string): Promise<{ ok: boolean }> {
	const r = await fetch('/api/process/states/delete', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fileName }),
	});
	if (!r.ok) {
		const errorData = await r.json().catch(() => ({}));
		throw new Error(errorData.error || `Delete state failed: ${r.status}`);
	}
	return r.json();
}
