import { ethers } from 'ethers';
import { Account } from '@utils/account';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';

const BUNGEE_REFUEL_CONTRACTS_ADDRESSES = [
	{
		network: ChainId.Optimism,
		address: '0x5800249621da520adfdca16da20d8a5fc0f814d8',
	},
	{
		network: ChainId.Arbitrum,
		address: '0xc0E02AA55d10e38855e13B64A8E1387A04681A00',
	},
	{
		network: ChainId.Bsc,
		address: '0xBE51D38547992293c89CC589105784ab60b004A9',
	},
	{
		network: ChainId.AvalancheC,
		address: '0x040993fbF458b95871Cd2D73Ee2E09F4AF6d56bB',
	},
	{
		network: ChainId.Ethereum,
		address: '0xb584D4bE1A5470CA1a8778E9B86c81e165204599',
	},
	{
		network: ChainId.Sonic,
		address: '0x040993fbF458b95871Cd2D73Ee2E09F4AF6d56bB',
	},
	{
		network: ChainId.Polygon,
		address: '0xAC313d7491910516E06FBfC2A0b5BB49bb072D91',
	},
	{
		network: ChainId.ZksyncEra,
		address: '0x7Ee459D7fDe8b4a3C22b9c8C7aa52AbadDd9fFD5',
	},
	{
		network: ChainId.Base,
		address: '0xE8c5b8488FeaFB5df316Be73EdE3Bdc26571a773',
	},
];

export abstract class Bungee {
	static async refuel(account: Account, network: Network, toChainId: ChainId, amount: string) {
		if (!account.wallets?.evm) throw new Error(`There is no account.wallets?.evm!`);
		if (!account.wallets.evm.private) throw new Error('There is no account.wallets.evm.private in wallet!');

		const bungeeContract = new ethers.Interface(BUNGEE_ABI);

		const contractAddress = BUNGEE_REFUEL_CONTRACTS_ADDRESSES.find((c) => c.network === network.chainId)?.address;
		if (!contractAddress) {
			throw new Error(`There is no ${network.chainId} network in BUNGEE_CONTRACTS_ADDRESSES`);
		}

		const data = bungeeContract.encodeFunctionData('depositNativeToken', [toChainId, account.wallets.evm.address]);

		const provider = network.getProvider();
		const transaction = await Evm.generateTransactionRequest(
			provider,
			account.wallets.evm.private,
			contractAddress,
			ethers.parseEther(amount),
			data,
		);

		await Evm.makeTransaction(provider, account.wallets.evm.private, transaction);

		await Logger.getInstance().log(`${amount} ${network.nativeCoin} refueled from ${network.name} to ${toChainId}`);
	}
}

const BUNGEE_ABI = [
	{ inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'destinationReceiver',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
			{
				indexed: true,
				internalType: 'uint256',
				name: 'destinationChainId',
				type: 'uint256',
			},
		],
		name: 'Deposit',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'sender',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
		],
		name: 'Donation',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'sender',
				type: 'address',
			},
		],
		name: 'GrantSender',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'previousOwner',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'newOwner',
				type: 'address',
			},
		],
		name: 'OwnershipTransferred',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'account',
				type: 'address',
			},
		],
		name: 'Paused',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'sender',
				type: 'address',
			},
		],
		name: 'RevokeSender',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'receiver',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'bytes32',
				name: 'srcChainTxHash',
				type: 'bytes32',
			},
		],
		name: 'Send',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'account',
				type: 'address',
			},
		],
		name: 'Unpaused',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'receiver',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
		],
		name: 'Withdrawal',
		type: 'event',
	},
	{
		inputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'chainId', type: 'uint256' },
					{ internalType: 'bool', name: 'isEnabled', type: 'bool' },
				],
				internalType: 'struct GasMovr.ChainData[]',
				name: '_routes',
				type: 'tuple[]',
			},
		],
		name: 'addRoutes',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address payable[]',
				name: 'receivers',
				type: 'address[]',
			},
			{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
			{
				internalType: 'bytes32[]',
				name: 'srcChainTxHashes',
				type: 'bytes32[]',
			},
			{ internalType: 'uint256', name: 'perUserGasAmount', type: 'uint256' },
			{ internalType: 'uint256', name: 'maxLimit', type: 'uint256' },
		],
		name: 'batchSendNativeToken',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		name: 'chainConfig',
		outputs: [
			{ internalType: 'uint256', name: 'chainId', type: 'uint256' },
			{ internalType: 'bool', name: 'isEnabled', type: 'bool' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'destinationChainId', type: 'uint256' },
			{ internalType: 'address', name: '_to', type: 'address' },
		],
		name: 'depositNativeToken',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'uint256', name: 'chainId', type: 'uint256' }],
		name: 'getChainData',
		outputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'chainId', type: 'uint256' },
					{ internalType: 'bool', name: 'isEnabled', type: 'bool' },
				],
				internalType: 'struct GasMovr.ChainData',
				name: '',
				type: 'tuple',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
		name: 'grantSenderRole',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'owner',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'paused',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
		name: 'processedHashes',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'renounceOwnership',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
		name: 'revokeSenderRole',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address payable', name: 'receiver', type: 'address' },
			{ internalType: 'uint256', name: 'amount', type: 'uint256' },
			{ internalType: 'bytes32', name: 'srcChainTxHash', type: 'bytes32' },
			{ internalType: 'uint256', name: 'perUserGasAmount', type: 'uint256' },
			{ internalType: 'uint256', name: 'maxLimit', type: 'uint256' },
		],
		name: 'sendNativeToken',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: '', type: 'address' }],
		name: 'senders',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'chainId', type: 'uint256' },
			{ internalType: 'bool', name: '_isEnabled', type: 'bool' },
		],
		name: 'setIsEnabled',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'setPause',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'setUnPause',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
		name: 'transferOwnership',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: '_to', type: 'address' },
			{ internalType: 'uint256', name: '_amount', type: 'uint256' },
		],
		name: 'withdrawBalance',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: '_to', type: 'address' }],
		name: 'withdrawFullBalance',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{ stateMutability: 'payable', type: 'receive' },
];
