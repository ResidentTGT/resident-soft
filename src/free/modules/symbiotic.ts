import { Account } from '@src/utils/account';
import { MissingFieldError } from '@src/utils/errors';
import { Logger } from '@src/utils/logger';
import { ChainId, Network } from '@src/utils/network';
import { ethers } from 'ethers';
import { Evm } from './evm';

const SYMBIOTIC_CONTRACTS = new Map<string, string>().set('cbETH', '0xB26ff591F44b04E78de18f43B46f8b70C6676984');

export abstract class Symbiotic {
	static async withdraw(account: Account, chainId: ChainId, vaultAddr: string): Promise<void> {
		if (!account.wallets?.evm?.private) {
			throw new MissingFieldError('wallets.evm.private');
		}

		const logger = await Logger.getInstance();
		const privateKey = account.wallets.evm.private;
		const wallet = new ethers.Wallet(privateKey);

		const network = await Network.getNetworkByChainId(chainId);

		const contract = new ethers.Contract(vaultAddr, ABI, network.getProvider());

		const balBn = await contract.balanceOf(account.wallets.evm.address);
		const decimals = await contract.decimals();
		const symbol = await contract.symbol();

		if (balBn === BigInt(0)) {
			await logger.log(`No assets to withdraw from vault ${vaultAddr}.`);
		} else {
			await Evm.generateAndMakeTransaction(
				network.getProvider(),
				privateKey,
				vaultAddr,
				BigInt(0),
				contract.interface.encodeFunctionData('withdraw', [wallet.address, balBn]),
			);

			await logger.log(`Withdrawed ${ethers.formatUnits(balBn, decimals)} ${symbol} from vault ${vaultAddr}.`);
		}
	}

	static async deposit(ACCOUNT: Account, network: Network, tokenSymbol: string, amount?: string) {
		if (!ACCOUNT.wallets?.evm?.address) throw new Error('There is no account.wallets.evm.address!');
		if (!ACCOUNT.wallets.evm.private) throw new Error('There is no account.wallets.evm.private in wallet!');

		await Logger.getInstance().log(`Start depositing ${amount} ${tokenSymbol} to Symbiotic ...`);

		const provider = network.getProvider();

		const contractAddress = SYMBIOTIC_CONTRACTS.get(tokenSymbol);
		if (!contractAddress) throw new Error(`No contract address for ${tokenSymbol}!`);

		const _amount = amount
			? ethers.parseEther(amount)
			: await Evm.getBalance(network, ACCOUNT.wallets.evm.address, tokenSymbol);
		await Evm.approve(network, ACCOUNT.wallets.evm.private, contractAddress, tokenSymbol, ethers.formatEther(_amount));

		const contract = new ethers.Contract(contractAddress, ABI, provider);

		const data = contract.interface.encodeFunctionData('deposit', [ACCOUNT.wallets.evm.address, _amount]);

		await Evm.makeTransaction(
			provider,
			ACCOUNT.wallets.evm.private,
			await Evm.generateTransactionRequest(provider, ACCOUNT.wallets.evm.private, contractAddress, BigInt(0), data),
		);

		await Logger.getInstance().log(`Deposited to Symbiotic.`);
	}
}

const ABI = [
	{ inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
	{ inputs: [{ internalType: 'address', name: 'target', type: 'address' }], name: 'AddressEmptyCode', type: 'error' },
	{
		inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
		name: 'AddressInsufficientBalance',
		type: 'error',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'spender', type: 'address' },
			{ internalType: 'uint256', name: 'allowance', type: 'uint256' },
			{ internalType: 'uint256', name: 'needed', type: 'uint256' },
		],
		name: 'ERC20InsufficientAllowance',
		type: 'error',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'sender', type: 'address' },
			{ internalType: 'uint256', name: 'balance', type: 'uint256' },
			{ internalType: 'uint256', name: 'needed', type: 'uint256' },
		],
		name: 'ERC20InsufficientBalance',
		type: 'error',
	},
	{ inputs: [{ internalType: 'address', name: 'approver', type: 'address' }], name: 'ERC20InvalidApprover', type: 'error' },
	{ inputs: [{ internalType: 'address', name: 'receiver', type: 'address' }], name: 'ERC20InvalidReceiver', type: 'error' },
	{ inputs: [{ internalType: 'address', name: 'sender', type: 'address' }], name: 'ERC20InvalidSender', type: 'error' },
	{ inputs: [{ internalType: 'address', name: 'spender', type: 'address' }], name: 'ERC20InvalidSpender', type: 'error' },
	{ inputs: [], name: 'ExceedsLimit', type: 'error' },
	{ inputs: [], name: 'FailedInnerCall', type: 'error' },
	{ inputs: [], name: 'InsufficientDeposit', type: 'error' },
	{ inputs: [], name: 'InsufficientIssueDebt', type: 'error' },
	{ inputs: [], name: 'InsufficientWithdraw', type: 'error' },
	{ inputs: [], name: 'InvalidInitialization', type: 'error' },
	{ inputs: [], name: 'NotInitializing', type: 'error' },
	{ inputs: [], name: 'NotLimitIncreaser', type: 'error' },
	{ inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
	{ inputs: [{ internalType: 'address', name: 'token', type: 'address' }], name: 'SafeERC20FailedOperation', type: 'error' },
	{ inputs: [], name: 'UnsafeCast', type: 'error' },
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'owner', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'spender', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
		],
		name: 'Approval',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'depositor', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
		],
		name: 'Deposit',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [{ indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }],
		name: 'IncreaseLimit',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [{ indexed: false, internalType: 'uint64', name: 'version', type: 'uint64' }],
		name: 'Initialized',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'issuer', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'debtIssued', type: 'uint256' },
		],
		name: 'IssueDebt',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'issuer', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'debtRepaid', type: 'uint256' },
		],
		name: 'RepayDebt',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [{ indexed: true, internalType: 'address', name: 'limitIncreaser', type: 'address' }],
		name: 'SetLimitIncreaser',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'from', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'to', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
		],
		name: 'Transfer',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'withdrawer', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
		],
		name: 'Withdraw',
		type: 'event',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'owner', type: 'address' },
			{ internalType: 'address', name: 'spender', type: 'address' },
		],
		name: 'allowance',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'spender', type: 'address' },
			{ internalType: 'uint256', name: 'value', type: 'uint256' },
		],
		name: 'approve',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'asset',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
		name: 'balanceOf',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'issuer', type: 'address' },
			{ internalType: 'address', name: 'recipient', type: 'address' },
		],
		name: 'debt',
		outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'decimals',
		outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'recipient', type: 'address' },
			{ internalType: 'uint256', name: 'amount', type: 'uint256' },
		],
		name: 'deposit',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		name: 'increaseLimit',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'asset_', type: 'address' },
			{ internalType: 'uint256', name: 'initialLimit', type: 'uint256' },
			{ internalType: 'address', name: 'limitIncreaser_', type: 'address' },
		],
		name: 'initialize',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'recipient', type: 'address' },
			{ internalType: 'uint256', name: 'amount', type: 'uint256' },
		],
		name: 'issueDebt',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'issuer', type: 'address' }],
		name: 'issuerDebt',
		outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'issuer', type: 'address' }],
		name: 'issuerRepaidDebt',
		outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'limit',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'limitIncreaser',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'name',
		outputs: [{ internalType: 'string', name: '', type: 'string' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }],
		name: 'recipientDebt',
		outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }],
		name: 'recipientRepaidDebt',
		outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'issuer', type: 'address' },
			{ internalType: 'address', name: 'recipient', type: 'address' },
		],
		name: 'repaidDebt',
		outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'limitIncreaser_', type: 'address' }],
		name: 'setLimitIncreaser',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'symbol',
		outputs: [{ internalType: 'string', name: '', type: 'string' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'totalDebt',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'totalRepaidDebt',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'totalSupply',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'value', type: 'uint256' },
		],
		name: 'transfer',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'from', type: 'address' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'value', type: 'uint256' },
		],
		name: 'transferFrom',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'recipient', type: 'address' },
			{ internalType: 'uint256', name: 'amount', type: 'uint256' },
		],
		name: 'withdraw',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
];
