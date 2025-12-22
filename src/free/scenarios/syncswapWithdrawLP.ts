import { MissingFieldError } from '@src/utils/errors';
import { Logger } from '@src/utils/logger';
import { ethers } from 'ethers';
import { Evm } from '../modules/evm';
import { Account } from '@src/utils/account';
import { ChainId, Network } from '@src/utils/network';

export async function syncswapWithdrawLP(account: Account) {
	if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
	const wal = new ethers.Wallet(account.wallets.evm.private);
	const network = await Network.getNetworkByChainId(ChainId.ZksyncEra);
	const token = network.tokens.find((t) => t.symbol === 'USDCWETHcSLP');
	if (!token) throw new Error('No USDCWETHcSLP token');
	const balBn = await Evm.getBalance(network, wal.address, token.symbol);
	const decimals = await Evm.getDecimals(network, token);
	const logger = await Logger.getInstance();
	const contractAddr = '0x2c81dF4F11A1C7E43Acb972e73767B1f5d0d9edc';
	if (balBn !== BigInt(0)) {
		await Evm.approve(network, account.wallets.evm.private, contractAddr, token.symbol, ethers.formatUnits(balBn, decimals));

		const contract = new ethers.Contract(
			contractAddr,
			[
				{
					inputs: [
						{ internalType: 'address', name: 'pool', type: 'address' },
						{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
						{ internalType: 'bytes', name: 'data', type: 'bytes' },
						{ internalType: 'uint256[]', name: 'minAmounts', type: 'uint256[]' },
						{ internalType: 'address', name: 'callback', type: 'address' },
						{ internalType: 'bytes', name: 'callbackData', type: 'bytes' },
					],
					name: 'burnLiquidity',
					outputs: [
						{
							components: [
								{ internalType: 'address', name: 'token', type: 'address' },
								{ internalType: 'uint256', name: 'amount', type: 'uint256' },
							],
							internalType: 'struct IPool.TokenAmount[]',
							name: 'amounts',
							type: 'tuple[]',
						},
					],
					stateMutability: 'nonpayable',
					type: 'function',
				},
			],
			network.getProvider(),
		);

		const data = await contract.interface.encodeFunctionData('burnLiquidity', [
			token.address,
			balBn,
			`0x000000000000000000000000${wal.address.slice(2)}0000000000000000000000000000000000000000000000000000000000000001`,
			[0, 0],
			'0x0000000000000000000000000000000000000000',
			'0x',
		]);

		await Evm.generateAndMakeTransaction(network.getProvider(), account.wallets.evm.private, contractAddr, BigInt(0), data);
	} else {
		await logger.log('No USDCWETHcSLP to withdraw.');
	}
}
