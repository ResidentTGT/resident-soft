import type { Configs } from '../../types';

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
	if (r.status === 423) throw Object.assign(new Error('нельзя менять конфиг во время работы скрипта'), { code: 423 });
	if (!r.ok) throw new Error(`Configs save failed: ${r.status}`);
	return r.json();
}
