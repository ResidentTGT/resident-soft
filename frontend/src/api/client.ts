import type { SelectionStatus, Configs } from '../types';

export async function getSelection(): Promise<SelectionStatus> {
	const r = await fetch('/api/selection');
	if (!r.ok) throw new Error(`Selection status failed: ${r.status}`);
	return r.json();
}

export async function chooseUI(): Promise<SelectionStatus> {
	const r = await fetch('/api/selection/choose', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ by: 'ui' }),
	});
	if (r.status === 409) throw Object.assign(new Error('Already chosen'), { code: 409 });
	if (!r.ok) throw new Error(`Choose failed: ${r.status}`);
	return r.json();
}

export async function getConfigs(): Promise<Configs> {
	const r = await fetch('/api/configs');
	if (!r.ok) throw new Error(`Configs fetch failed: ${r.status}`);
	return r.json();
}

export async function postConfigs(payload: Configs) {
	const r = await fetch('/api/configs', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	if (r.status === 423) throw Object.assign(new Error('Configs are locked by selection'), { code: 423 });
	if (!r.ok) throw new Error(`Configs save failed: ${r.status}`);
	return r.json();
}
