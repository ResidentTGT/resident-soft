import { Account } from './account';

export function resolveAdresses(account: Account, dest: string): string {
	if (!dest) throw new Error(`No destination address provided!`);

	if (dest === 'evm') {
		if (!account.wallets?.evm?.address) {
			throw new Error('EVM address not found!');
		}
		return account.wallets.evm.address;
	}

	if (dest === 'solana') {
		if (!account.wallets?.solana?.address) {
			throw new Error('Solana address not found!');
		}
		return account.wallets.solana.address;
	}

	if (dest === 'okx-evm') {
		if (!account.cexs?.okx?.evmDepositAddress) {
			throw new Error('OKX EVM deposit address not found!');
		}
		return account.cexs.okx.evmDepositAddress;
	}
	if (dest === 'bitget-evm') {
		if (!account.cexs?.bitget?.evmDepositAddress) {
			throw new Error('Bitget EVM deposit address not found!');
		}
		return account.cexs.bitget.evmDepositAddress;
	}
	if (dest === 'okx-solana') {
		if (!account.cexs?.okx?.solanaDepositAddress) {
			throw new Error('OKX Solana deposit address not found!');
		}
		return account.cexs.okx.solanaDepositAddress;
	}
	if (dest === 'bitget-solana') {
		if (!account.cexs?.bitget?.solanaDepositAddress) {
			throw new Error('Bitget Solana deposit address not found!');
		}
		return account.cexs.bitget.solanaDepositAddress;
	}
	return dest;
}
