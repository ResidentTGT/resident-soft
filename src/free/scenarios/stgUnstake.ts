import { MissingFieldError } from '@src/utils/errors';
import { Logger } from '@src/utils/logger';
import { ethers } from 'ethers';
import { Evm } from '../modules/evm';
import { Account } from '@src/utils/account';
import { ChainId, Network } from '@src/utils/network';

export async function stgUnstake(account: Account) {
	if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
	const wal = new ethers.Wallet(account.wallets.evm.private);
	const network = await Network.getNetworkByChainId(ChainId.Arbitrum);
	const token = network.tokens.find((t) => t.symbol === 'veSTG');
	if (!token) throw new Error('No veSTG token');
	const balBn = await Evm.getBalance(network, wal.address, token.symbol);
	const logger = await Logger.getInstance();
	const contractAddr = token.address;
	if (balBn !== BigInt(0)) {
		await Evm.generateAndMakeTransaction(
			network.getProvider(),
			account.wallets.evm.private,
			contractAddr,
			BigInt(0),
			'0x3ccfd60b',
		);
	} else {
		await logger.log('No veSTG to withdraw.');
	}
}
