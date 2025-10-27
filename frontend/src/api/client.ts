import type { ActionsGroup } from '../../../src/actions';
import type { AccountsFile } from '../../../src/utils/account';
import type { NetworkConfig } from '../../../src/utils/network';
import type { TokenConfig } from '../../../src/utils/network/network';
import type { SelectionStatus, Configs } from '../types';

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

export async function getStorage(): Promise<{ encrypted: any; decrypted: any }> {
	const r = await fetch('/api/secrets/storage');
	if (!r.ok) throw new Error(`Storage fetch failed: ${r.status}`);
	return r.json();
}

export async function getAccounts(): Promise<{
	encrypted: AccountsFile[];
	decrypted: AccountsFile[];
}> {
	const r = await fetch('/api/secrets/accounts');
	if (!r.ok) throw new Error(`Accounts fetch failed: ${r.status}`);
	return r.json();
}

export async function postSecrets(data: { encrypted: any; decrypted: any }) {
	const r = await fetch('/api/secrets/storage', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (!r.ok) throw new Error(`Secret storage save failed: ${r.status}`);
	return r.json();
}

export async function postAccounts(data: { encrypted: any; decrypted: any }) {
	const r = await fetch('/api/secrets/accounts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/jsonl' },
		body: JSON.stringify(data),
	});
	if (!r.ok) throw new Error(`Accounts save failed: ${r.status}`);
	return r.json();
}

export async function createAccountsFile(data: { variant: 'encrypted' | 'decrypted'; fileName: string }) {
	const r = await fetch('/api/secrets/accounts/create', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (!r.ok) throw new Error(`Create accounts file failed: ${r.status}`);
	return r.json();
}

export async function deleteAccountsFile(data: { variant: 'encrypted' | 'decrypted'; fileName: string }) {
	const r = await fetch('/api/secrets/accounts/delete', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (!r.ok) throw new Error(`Delete accounts file failed: ${r.status}`);
	return r.json();
}

export async function encryptSecrets(password: string, encryption: boolean) {
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

export async function encryptAccounts(password: string) {
	const r = await fetch('/api/secrets/accounts/encrypt', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password }),
	});
	if (!r.ok) throw new Error(`encryptAccounts: ${r.status}`);
	return r.json();
}
export async function decryptAccounts(password: string) {
	const r = await fetch('/api/secrets/accounts/decrypt', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password }),
	});
	if (!r.ok) {
		if (r.status === 403) throw Object.assign(new Error('Неправильный пароль'), { code: 403 });
		throw new Error(`Accounts decryption failed: ${r.status}`);
	}
	return r.json();
}
export async function encryptStorage(password: string) {
	const r = await fetch('/api/secrets/storage/encrypt', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password }),
	});
	if (!r.ok) throw new Error(`encryptStorage: ${r.status}`);
	return r.json();
}
export async function decryptStorage(password: string) {
	const r = await fetch('/api/secrets/storage/decrypt', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password }),
	});
	if (!r.ok) {
		if (r.status === 403) throw Object.assign(new Error('Неправильный пароль'), { code: 403 });
		throw new Error(`Storage decryption failed: ${r.status}`);
	}
	return r.json();
}
