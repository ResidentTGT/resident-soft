import type { AccountsFile } from '../../../../src/utils/account';

// Secret Storage
export async function getStorage(): Promise<{ encrypted: any; decrypted: any }> {
	const r = await fetch('/api/secrets/storage');
	if (!r.ok) throw new Error(`Storage fetch failed: ${r.status}`);
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

// Accounts
export async function getAccounts(): Promise<{
	encrypted: AccountsFile[];
	decrypted: AccountsFile[];
}> {
	const r = await fetch('/api/secrets/accounts');
	if (!r.ok) throw new Error(`Accounts fetch failed: ${r.status}`);
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

export async function deleteAllAccountsFiles(data: { variant: 'encrypted' | 'decrypted' }) {
	const r = await fetch('/api/secrets/accounts/deleteall', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (!r.ok) throw new Error(`Delete accounts files failed: ${r.status}`);
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
