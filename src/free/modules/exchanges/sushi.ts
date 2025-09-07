import { ethers } from 'ethers';
import { Account } from '@utils/account';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';
import { CoinMarketCap } from '@freeModules/coinMarketCap';

const SUSHI_ROUTER_CONTRACT_ADDRESSES = new Map([
	[ChainId.Arbitrum, '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506'],
	[ChainId.Polygon, '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'],
]);

export abstract class Sushi {
	static async swap(
		ACCOUNT: Account,
		network: Network,
		tokenSymbol1: string,
		tokenSymbol2: string,
		cmcApiKey: string,
		amountOfToken1?: string,
		slippageInPercent = 1,
	) {
		if (!ACCOUNT.wallets?.evm?.address) throw new Error('There is no account.wallets.evm.address!');
		if (!ACCOUNT.wallets.evm.private) throw new Error('There is no account.wallets.evm.private in wallet!');

		const token1 = network.tokens.find((t) => t.symbol === tokenSymbol1);
		const token2 = network.tokens.find((t) => t.symbol === tokenSymbol2);
		const wToken = network.tokens.find((t) => t.symbol === 'W' + network.nativeCoin);
		if (!token1 || !token2 || !wToken) throw new Error(`There is no ${tokenSymbol1} or ${tokenSymbol2} in network tokens!`);

		const decimals1 = await Evm.getDecimals(network, token1);
		const decimals2 = await Evm.getDecimals(network, token2);

		const balance = await Evm.getBalance(network, ACCOUNT.wallets.evm.address, token1.symbol);
		if (balance === BigInt(0)) throw new Error(`Balance of ${token1.symbol} is 0!`);
		const amountBn = amountOfToken1 ? ethers.parseUnits(amountOfToken1, decimals1) : balance;
		const amount = ethers.formatUnits(amountBn, decimals1);
		if (balance < amountBn) {
			throw new Error(
				`Balance (${ethers.formatUnits(
					balance,
					decimals1,
				)} ${tokenSymbol1}) is less than amount (${amount} ${tokenSymbol1})!`,
			);
		}
		const contractAddress = SUSHI_ROUTER_CONTRACT_ADDRESSES.get(network.chainId);
		if (!contractAddress) throw new Error();
		if (tokenSymbol1 !== network.nativeCoin) {
			if (!contractAddress) throw new Error(`There is no contract address for ${network.name}`);
			await Evm.approve(network, ACCOUNT.wallets.evm.private, contractAddress, tokenSymbol1, amount);
		}

		await Logger.getInstance().log(
			`Start swapping ${amount} ${tokenSymbol1} to ${tokenSymbol2} on Sushi from ${ACCOUNT.wallets.evm.address} ...`,
		);

		const provider = network.getProvider();
		const tokenSymbolForCmc1 = tokenSymbol1 === 'USDC.e' ? 'USDC' : tokenSymbol1;
		const tokenSymbolForCmc2 = tokenSymbol2 === 'USDC.e' ? 'USDC' : tokenSymbol2;
		const prices = await CoinMarketCap.getTokensPrices([tokenSymbolForCmc1, tokenSymbolForCmc2], cmcApiKey);
		const price1 = prices.find((p) => p.symbol === tokenSymbolForCmc1);
		const price2 = prices.find((p) => p.symbol === tokenSymbolForCmc2);

		if (!price1 || !price2) throw new Error(`Couldnt get prices for ${tokenSymbol1} or ${tokenSymbol2}`);

		const rate = price1.price / price2.price;
		const minAmountOfToken2 = (+amount * rate * (1 - slippageInPercent / 100)).toFixed(decimals2);
		const minAmountOfToken2Bn = ethers.parseUnits(minAmountOfToken2, decimals2);

		const contract = new ethers.Interface(ROUTER_ABI);
		const tokenAddress1 = tokenSymbol1 === network.nativeCoin ? wToken.address : token1.address;
		const tokenAddress2 = tokenSymbol2 === network.nativeCoin ? wToken.address : token2.address;

		const method =
			tokenSymbol1 === network.nativeCoin
				? 'swapExactETHForTokens'
				: tokenSymbol2 === network.nativeCoin
					? 'swapExactTokensForETH'
					: 'swapExactTokensForTokens';
		const data = [
			minAmountOfToken2Bn,
			[tokenAddress1, tokenAddress2],
			ACCOUNT.wallets.evm.address,
			Math.floor(Date.now() + 1000000),
		];
		if (tokenSymbol1 !== network.nativeCoin) data.unshift(amountBn);

		const encodedData = contract.encodeFunctionData(method, data);
		const value = tokenSymbol1 === network.nativeCoin ? amountBn : BigInt(0);

		const transaction = await Evm.generateTransactionRequest(
			provider,
			ACCOUNT.wallets.evm.private,
			contractAddress,
			value,
			encodedData,
		);

		await Evm.makeTransaction(provider, ACCOUNT.wallets.evm.private, transaction);

		await Logger.getInstance().log(
			`${amount} ${tokenSymbol1} swapped for ${tokenSymbol2} on Sushi from ${ACCOUNT.wallets.evm.address} .`,
		);
	}
}

const ROUTER_ABI = [
	{
		inputs: [
			{ internalType: 'address', name: '_factory', type: 'address' },
			{ internalType: 'address', name: '_WETH', type: 'address' },
		],
		stateMutability: 'nonpayable',
		type: 'constructor',
	},
	{
		inputs: [],
		name: 'WETH',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
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
		name: 'factory',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountOut', type: 'uint256' },
			{ internalType: 'uint256', name: 'reserveIn', type: 'uint256' },
			{ internalType: 'uint256', name: 'reserveOut', type: 'uint256' },
		],
		name: 'getAmountIn',
		outputs: [{ internalType: 'uint256', name: 'amountIn', type: 'uint256' }],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountIn', type: 'uint256' },
			{ internalType: 'uint256', name: 'reserveIn', type: 'uint256' },
			{ internalType: 'uint256', name: 'reserveOut', type: 'uint256' },
		],
		name: 'getAmountOut',
		outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountOut', type: 'uint256' },
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
		],
		name: 'getAmountsIn',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountIn', type: 'uint256' },
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
		],
		name: 'getAmountsOut',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountA', type: 'uint256' },
			{ internalType: 'uint256', name: 'reserveA', type: 'uint256' },
			{ internalType: 'uint256', name: 'reserveB', type: 'uint256' },
		],
		name: 'quote',
		outputs: [{ internalType: 'uint256', name: 'amountB', type: 'uint256' }],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
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
			{ internalType: 'address', name: 'token', type: 'address' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountETHMin', type: 'uint256' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
			{ internalType: 'bool', name: 'approveMax', type: 'bool' },
			{ internalType: 'uint8', name: 'v', type: 'uint8' },
			{ internalType: 'bytes32', name: 'r', type: 'bytes32' },
			{ internalType: 'bytes32', name: 's', type: 'bytes32' },
		],
		name: 'removeLiquidityETHWithPermit',
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
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountETHMin', type: 'uint256' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
			{ internalType: 'bool', name: 'approveMax', type: 'bool' },
			{ internalType: 'uint8', name: 'v', type: 'uint8' },
			{ internalType: 'bytes32', name: 'r', type: 'bytes32' },
			{ internalType: 'bytes32', name: 's', type: 'bytes32' },
		],
		name: 'removeLiquidityETHWithPermitSupportingFeeOnTransferTokens',
		outputs: [{ internalType: 'uint256', name: 'amountETH', type: 'uint256' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'tokenA', type: 'address' },
			{ internalType: 'address', name: 'tokenB', type: 'address' },
			{ internalType: 'uint256', name: 'liquidity', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
			{ internalType: 'bool', name: 'approveMax', type: 'bool' },
			{ internalType: 'uint8', name: 'v', type: 'uint8' },
			{ internalType: 'bytes32', name: 'r', type: 'bytes32' },
			{ internalType: 'bytes32', name: 's', type: 'bytes32' },
		],
		name: 'removeLiquidityWithPermit',
		outputs: [
			{ internalType: 'uint256', name: 'amountA', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountB', type: 'uint256' },
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountOut', type: 'uint256' },
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapETHForExactTokens',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
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
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
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
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
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
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
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
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
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
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountOut', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountInMax', type: 'uint256' },
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapTokensForExactETH',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amountOut', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountInMax', type: 'uint256' },
			{ internalType: 'address[]', name: 'path', type: 'address[]' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
		],
		name: 'swapTokensForExactTokens',
		outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{ stateMutability: 'payable', type: 'receive' },
];
