import type { ActionsGroup } from '../../../src/actions';
import type { NetworkConfig } from '../../../src/utils/network';
import type { TokenConfig } from '../../../src/utils/network/network';
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
	if (r.status === 423) throw Object.assign(new Error('нельзя менять конфиг во время работы скрипта'), { code: 423 });
	if (!r.ok) throw new Error(`Configs save failed: ${r.status}`);
	return r.json();
}

export async function getActions(): Promise<ActionsGroup[]> {
	const r = await fetch('/api/actions');
	if (!r.ok) throw new Error(`Actions fetch failed: ${r.status}`);
	return r.json();
}

export async function getNetworks(): Promise<NetworkConfig[]> {
	const r = await fetch('/api/networks');
	if (!r.ok) throw new Error(`Networks fetch failed: ${r.status}`);
	return r.json();
}

export async function getAccountsFiles(): Promise<string[]> {
	const r = await fetch('/api/accsfiles');
	if (!r.ok) throw new Error(`Accounts files fetch failed: ${r.status}`);
	return r.json();
}

export async function getTokens(): Promise<TokenConfig[]> {
	const r = await fetch('/api/tokens');
	if (!r.ok) throw new Error(`Tokens fetch failed: ${r.status}`);
	return r.json();
}

export async function getSecrets() {
	const r = await fetch('/api/secrets');
	if (!r.ok) throw new Error(`Secrets fetch failed: ${r.status}`);
	return r.json();
}

export async function postSecrets(data: { encrypted: any; decrypted: any }) {
	const r = await fetch('/api/secrets', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (r.status === 423) throw Object.assign(new Error('нельзя менять данные во время работы скрипта'), { code: 423 });
	if (!r.ok) throw new Error(`Secrets save failed: ${r.status}`);
	return r.json();
}

export async function encryptSecretStorage(password: string, encryption: boolean) {
	const r = await fetch('/api/encryptsecrets', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password, encryption }),
	});

	if (!r.ok) {
		if (r.status === 403) throw Object.assign(new Error('Неправильный пароль'), { code: 403 });
		throw new Error(`Secrets encryption failed: ${r.status}`);
	}
	return r.json();
}
