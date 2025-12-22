import { MissingFieldError } from '@src/utils/errors';
import { Logger } from '@src/utils/logger';
import { ethers } from 'ethers';
import { Evm } from '../modules/evm';
import { Account } from '@src/utils/account';
import { ChainId, Network } from '@src/utils/network';

export async function lombardUnstake(account: Account) {
	if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
	const wal = new ethers.Wallet(account.wallets.evm.private);
	const network = await Network.getNetworkByChainId(ChainId.Sonic);
	const token = network.tokens.find((t) => t.symbol === 'sonicLBTCv');
	if (!token) throw new Error('No sonicLBTCv token');
	const balBn = await Evm.getBalance(network, wal.address, token.symbol);
	const decimals = await Evm.getDecimals(network, token);
	const logger = await Logger.getInstance();
	const contractAddr = '0xAea73B51380Fa5C0f76F0611c4346af4090ED2D7';
	if (balBn !== BigInt(0)) {
		await Evm.approve(network, account.wallets.evm.private, contractAddr, token.symbol, ethers.formatUnits(balBn, decimals));

		const contract = new ethers.Contract(
			contractAddr,
			[
				{
					inputs: [
						{ internalType: 'address', name: 'assetOut', type: 'address' },
						{ internalType: 'uint128', name: 'amountOfShares', type: 'uint128' },
						{ internalType: 'uint16', name: 'discount', type: 'uint16' },
						{ internalType: 'uint24', name: 'secondsToDeadline', type: 'uint24' },
					],
					name: 'requestOnChainWithdraw',
					outputs: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }],
					stateMutability: 'nonpayable',
					type: 'function',
				},
			],
			network.getProvider(),
		);

		const data = await contract.interface.encodeFunctionData('requestOnChainWithdraw', [
			'0xecAc9C5F704e954931349Da37F60E39f515c11c1',
			balBn,
			1,
			259200,
		]);

		await Evm.generateAndMakeTransaction(network.getProvider(), account.wallets.evm.private, contractAddr, BigInt(0), data);
	} else {
		await logger.log('No sonicLBTCv to withdraw.');
	}
}
