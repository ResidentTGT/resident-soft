import { ethers } from 'ethers';
import { Account } from '@utils/account';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';

const CONTRACTS = new Map<ChainId, string>()
	.set(ChainId.ZksyncEra, '0xD48e3caf0D948203434646a3f3e80f8Ee18007dc')
	.set(ChainId.Linea, '0xd7487D1ff3b2433B32E6d4c333F70A462B99F300')
	.set(ChainId.Scroll, '0xe6feca764b7548127672c189d303eb956c3ba372')
	.set(ChainId.Soneium, '0xBF6B575e5a2a1272AE7bAEdABc00Cf016f2f437c')
	.set(ChainId.Base, '0x26637c9fDbD5Ecdd76a9E21Db7ea533e1B0713b6');

export abstract class Owlto {
	static async dailyCheckIn(ACCOUNT: Account, network: Network) {
		if (!ACCOUNT.wallets?.evm?.address) throw new Error('There is no account.wallets.evm.address!');
		if (!ACCOUNT.wallets.evm.private) throw new Error('There is no account.wallets.evm.private in wallet!');

		await Logger.getInstance().log(`Start daily check in ...`);

		const contract = new ethers.Interface(ABI as any);

		const contractAddress = CONTRACTS.get(network.chainId);
		if (!contractAddress) throw new Error(`There is no contract address of Owlto in ${network.name}`);

		const data = contract.encodeFunctionData('checkIn', [+new Date().toISOString().split('T')[0].replaceAll('-', '')]);

		const provider = network.getProvider();
		const transaction = await Evm.generateTransactionRequest(
			provider,
			ACCOUNT.wallets.evm.private,
			contractAddress,
			BigInt(0),
			data,
		);

		await Evm.makeTransaction(provider, ACCOUNT.wallets.evm.private, transaction);

		await Logger.getInstance().log(`Checked in.`);
	}
}

const ABI = [
	{
		type: 'function',
		name: 'checkIn',
		constant: false,
		inputs: [
			{
				name: 'date',
				type: 'uint256',
				baseType: 'uint256',
				_isParamType: true,
			},
		],
		outputs: [],
		payable: false,
		stateMutability: 'nonpayable',
		_isFragment: true,
	},
];
