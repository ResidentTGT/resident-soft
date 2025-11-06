import { ethers } from 'ethers';
import { Account } from '@utils/account';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { Network } from '@utils/network';
import { MissingFieldError } from '@src/utils/errors';

const ROUTER_CONTRACT_ADDR = '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858';
const FACTORY_ADDR = '0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a';

export interface Route {
	from: string;
	to: string;
	stable: boolean;
	factory: string;
}

export abstract class Velodrome {
	static async swap(
		account: Account,
		network: Network,
		tokenSymbol1: string,
		tokenSymbol2: string,
		amountOfToken1?: string,
		slippageInPercent = 1,
	) {
		if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');

		const wallet = new ethers.Wallet(account.wallets.evm.private);
		const token1 = network.tokens.find((t) => t.symbol === tokenSymbol1);
		const token2 = network.tokens.find((t) => t.symbol === tokenSymbol2);
		const wethToken = network.tokens.find((t) => t.symbol === 'WETH');

		if (!token1 || !token2 || !wethToken)
			throw new Error(`There is no ${tokenSymbol1} or ${tokenSymbol2} or WETH in network tokens!`);

		const decimals1 = await Evm.getDecimals(network, token1);
		const decimals2 = await Evm.getDecimals(network, token2);

		const balance1 = await Evm.getBalance(network, wallet.address, token1.symbol);
		if (balance1 === BigInt(0)) throw new Error(`Balance of ${token1.symbol} is 0!`);
		const amountBn1 = amountOfToken1 ? ethers.parseUnits(amountOfToken1.toString(), decimals1) : balance1;
		const amount1 = ethers.formatUnits(amountBn1, decimals1);
		if (balance1 < amountBn1) {
			throw new Error(
				`Balance (${ethers.formatUnits(
					balance1,
					decimals1,
				)} ${tokenSymbol1}) is less than amount (${amount1} ${tokenSymbol1})!`,
			);
		}

		const candidates = this.buildCandidates(
			tokenSymbol1 === network.nativeCoin ? wethToken.address : token1.address,
			tokenSymbol2 === network.nativeCoin ? wethToken.address : token2.address,
			FACTORY_ADDR,
		);

		const provider = network.getProvider();
		const { route, out } = await this.pickBestRoute(ROUTER_CONTRACT_ADDR, provider, amountBn1, candidates);

		const amountOutMinBn2 = (out * BigInt(100 - slippageInPercent)) / 100n;

		if (tokenSymbol1 !== network.nativeCoin) {
			await Evm.approve(network, wallet.privateKey, ROUTER_CONTRACT_ADDR, tokenSymbol1, amount1);
		}

		await Logger.getInstance().log(`Start swapping ${amount1} ${tokenSymbol1} to ${tokenSymbol2} on Velodrome ...`);

		const contract = new ethers.Interface(ROUTER_ABI);

		const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

		const data =
			tokenSymbol1 === network.nativeCoin
				? contract.encodeFunctionData('swapExactETHForTokens', [amountOutMinBn2, route, wallet.address, deadline])
				: contract.encodeFunctionData(
						tokenSymbol2 === network.nativeCoin ? 'swapExactTokensForETH' : 'swapExactTokensForTokens',
						[amountBn1, amountOutMinBn2, route, wallet.address, deadline],
					);

		const value = tokenSymbol1 === network.nativeCoin ? amountBn1 : BigInt(0);

		const transaction = await Evm.generateTransactionRequest(
			provider,
			account.wallets.evm.private,
			ROUTER_CONTRACT_ADDR,
			value,
			data,
		);

		await Evm.makeTransaction(provider, account.wallets.evm.private, transaction);

		await Logger.getInstance().log(
			`${amount1} ${tokenSymbol1} swapped for minimum ${ethers.formatUnits(amountOutMinBn2, decimals2)} ${tokenSymbol2} on Velodrome.`,
		);
	}

	static buildCandidates(tokenInErc20: string, tokenOut: string, factory: string): Route[][] {
		const r = (from: string, to: string, stable: boolean, factory: string): Route => ({ from, to, stable, factory });
		const direct: Route[][] = [[r(tokenInErc20, tokenOut, false, factory)], [r(tokenInErc20, tokenOut, true, factory)]];

		return [...direct];
	}

	static async pickBestRoute(
		routerAddr: string,
		signerOrProvider: ethers.Signer | ethers.Provider,
		amountIn: bigint,
		candidates: Route[][],
	) {
		const router = new ethers.Contract(routerAddr, ROUTER_ABI, signerOrProvider);
		let best: { route: Route[]; out: bigint } | null = null;

		for (const route of candidates) {
			try {
				const amounts: bigint[] = await router.getAmountsOut(amountIn, route);
				const out = amounts[amounts.length - 1] ?? 0n;
				if (!best || out > best.out) best = { route, out };
			} catch {
				// пропускаем несуществующие/плохие пары
			}
		}
		if (!best) throw new Error('No viable route found');
		return best;
	}
}

const ROUTER_ABI = [
	{
		inputs: [
			{ internalType: 'address', name: '_forwarder', type: 'address' },
			{ internalType: 'address', name: '_factoryRegistry', type: 'address' },
			{ internalType: 'address', name: '_v1Factory', type: 'address' },
			{ internalType: 'address', name: '_factory', type: 'address' },
			{ internalType: 'address', name: '_voter', type: 'address' },
			{ internalType: 'address', name: '_weth', type: 'address' },
		],
		stateMutability: 'nonpayable',
		type: 'constructor',
	},
	{ inputs: [], name: 'ConversionFromV2ToV1VeloProhibited', type: 'error' },
	{ inputs: [], name: 'ETHTransferFailed', type: 'error' },
	{ inputs: [], name: 'Expired', type: 'error' },
	{ inputs: [], name: 'InsufficientAmount', type: 'error' },
	{ inputs: [], name: 'InsufficientAmountA', type: 'error' },
	{ inputs: [], name: 'InsufficientAmountADesired', type: 'error' },
	{ inputs: [], name: 'InsufficientAmountAOptimal', type: 'error' },
	{ inputs: [], name: 'InsufficientAmountB', type: 'error' },
	{ inputs: [], name: 'InsufficientAmountBDesired', type: 'error' },
	{ inputs: [], name: 'InsufficientLiquidity', type: 'error' },
	{ inputs: [], name: 'InsufficientOutputAmount', type: 'error' },
	{ inputs: [], name: 'InvalidAmountInForETHDeposit', type: 'error' },
	{ inputs: [], name: 'InvalidPath', type: 'error' },
	{ inputs: [], name: 'InvalidRouteA', type: 'error' },
	{ inputs: [], name: 'InvalidRouteB', type: 'error' },
	{ inputs: [], name: 'InvalidTokenInForETHDeposit', type: 'error' },
	{ inputs: [], name: 'OnlyWETH', type: 'error' },
	{ inputs: [], name: 'PoolDoesNotExist', type: 'error' },
	{ inputs: [], name: 'PoolFactoryDoesNotExist', type: 'error' },
	{ inputs: [], name: 'SameAddresses', type: 'error' },
	{ inputs: [], name: 'ZeroAddress', type: 'error' },
	{
		inputs: [],
		name: 'ETHER',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routes',
				type: 'tuple[]',
			},
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'UNSAFE_swapExactTokensForTokens',
		outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'uint256', name: 'amountADesired', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountBDesired', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'addLiquidity',
		outputs: [
			{ internalType: 'uint256', name: 'amountA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountB', type: 'uint256' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'token', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'uint256', name: 'amountTokenDesired', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountETHMin', type: 'uint256' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'addLiquidityETH',
		outputs: [
			{ internalType: 'uint256', name: 'amountToken', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountETH', type: 'uint256' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'defaultFactory',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'factoryRegistry',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'address', name: '_factory', type: 'address' },
			{ internalType: 'uint256', name: 'amountInA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountInB', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routesA',
				type: 'tuple[]',
			},
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routesB',
				type: 'tuple[]',
			},
		],
		name: 'generateZapInParams',
		outputs: [
			{ internalType: 'uint256', name: 'amountOutMinA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountOutMinB', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'address', name: '_factory', type: 'address' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routesA',
				type: 'tuple[]',
			},
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routesB',
				type: 'tuple[]',
			},
		],
		name: 'generateZapOutParams',
		outputs: [
			{ internalType: 'uint256', name: 'amountOutMinA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountOutMinB', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountIn', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routes',
				type: 'tuple[]',
			},
		],
		name: 'getAmountsOut',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'address', name: '_factory', type: 'address' },
		],
		name: 'getReserves',
		outputs: [
			{ internalType: 'uint256', name: 'reserveA', type: 'uint256' },
			{ internalType: 'uint256', name: 'reserveB', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'forwarder', type: 'address' }],
		name: 'isTrustedForwarder',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'address', name: '_factory', type: 'address' },
		],
		name: 'pairFor',
		outputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'address', name: '_factory', type: 'address' },
		],
		name: 'poolFor',
		outputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'address', name: '_factory', type: 'address' },
			{ internalType: 'uint256', name: 'amountADesired', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountBDesired', type: 'uint256' },
		],
		name: 'quoteAddLiquidity',
		outputs: [
			{ internalType: 'uint256', name: 'amountA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountB', type: 'uint256' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'address', name: '_factory', type: 'address' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
		],
		name: 'quoteRemoveLiquidity',
		outputs: [
			{ internalType: 'uint256', name: 'amountA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountB', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'address', name: '_factory', type: 'address' },
		],
		name: 'quoteStableLiquidityRatio',
		outputs: [{ internalType: 'uint256', name: 'ratio', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'removeLiquidity',
		outputs: [
			{ internalType: 'uint256', name: 'amountA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountB', type: 'uint256' },
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'token', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountETHMin', type: 'uint256' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'removeLiquidityETH',
		outputs: [
			{ internalType: 'uint256', name: 'amountToken', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountETH', type: 'uint256' },
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'token', type: 'address' },
			{ internalType: 'bool', name: 'stable', type: 'bool' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountETHMin', type: 'uint256' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'removeLiquidityETHSupportingFeeOnTransferTokens',
		outputs: [{ internalType: 'uint256', name: 'amountETH', type: 'uint256' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
		],
		name: 'sortTokens',
		outputs: [
			{ internalType: 'address', name: 'token0', type: 'address' },
			{ internalType: 'address', name: 'token1', type: 'address' },
		],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routes',
				type: 'tuple[]',
			},
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapExactETHForTokens',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routes',
				type: 'tuple[]',
			},
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountIn', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routes',
				type: 'tuple[]',
			},
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapExactTokensForETH',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountIn', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routes',
				type: 'tuple[]',
			},
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountIn', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routes',
				type: 'tuple[]',
			},
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapExactTokensForTokens',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountIn', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routes',
				type: 'tuple[]',
			},
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'v1Factory',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'voter',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'weth',
		outputs: [{ internalType: 'contract IWETH', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenIn', type: 'address' },
			{ internalType: 'uint256', name: 'amountInA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountInB', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'tokenA', type: 'address' },
					{ internalType: 'address', name: 'tokenB', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
					{ internalType: 'uint256', name: 'amountOutMinA', type: 'uint256' },
					{ internalType: 'uint256', name: 'amountOutMinB', type: 'uint256' },
					{ internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
					{ internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
				],
				internalType: 'struct IRouter.Zap',
				name: 'zapInPool',
				type: 'tuple',
			},
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routesA',
				type: 'tuple[]',
			},
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routesB',
				type: 'tuple[]',
			},
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'bool', name: 'stake', type: 'bool' },
		],
		name: 'zapIn',
		outputs: [{ internalType: 'uint256', name: 'liquidity', type: 'uint256' }],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenOut', type: 'address' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
			{
				components: [
					{ internalType: 'address', name: 'tokenA', type: 'address' },
					{ internalType: 'address', name: 'tokenB', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
					{ internalType: 'uint256', name: 'amountOutMinA', type: 'uint256' },
					{ internalType: 'uint256', name: 'amountOutMinB', type: 'uint256' },
					{ internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
					{ internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
				],
				internalType: 'struct IRouter.Zap',
				name: 'zapOutPool',
				type: 'tuple',
			},
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routesA',
				type: 'tuple[]',
			},
			{
				components: [
					{ internalType: 'address', name: 'from', type: 'address' },
					{ internalType: 'address', name: 'to', type: 'address' },
					{ internalType: 'bool', name: 'stable', type: 'bool' },
					{ internalType: 'address', name: 'factory', type: 'address' },
				],
				internalType: 'struct IRouter.Route[]',
				name: 'routesB',
				type: 'tuple[]',
			},
		],
		name: 'zapOut',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{ stateMutability: 'payable', type: 'receive' },
];
