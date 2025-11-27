import type { ActionsGroup } from '../../../../src/actions';
import type { NetworkConfig } from '../../../../src/utils/network';
import type { TokenConfig } from '../../../../src/utils/network/network';

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

export async function getTokens(): Promise<TokenConfig[]> {
	const r = await fetch('/api/tokens');
	if (!r.ok) throw new Error(`Tokens fetch failed: ${r.status}`);
	return r.json();
}
