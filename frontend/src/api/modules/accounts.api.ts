export async function getAccountsFiles(): Promise<string[]> {
	const r = await fetch('/api/accsfiles');
	if (!r.ok) throw new Error(`Accounts files fetch failed: ${r.status}`);
	return r.json();
}
