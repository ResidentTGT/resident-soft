import type { SelectionStatus } from '../../types';

export async function getSelection(): Promise<SelectionStatus> {
	const r = await fetch('/api/selection');
	if (!r.ok) throw new Error(`Selection status failed: ${r.status}`);
	return r.json();
}

export async function chooseUI(key?: string): Promise<SelectionStatus> {
	const r = await fetch('/api/selection/choose', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ by: 'ui', key }),
	});
	if (r.status === 409) throw Object.assign(new Error('Already chosen'), { code: 409 });
	if (!r.ok) throw new Error(`Choose failed: ${r.status}`);
	return r.json();
}
