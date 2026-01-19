import { ethers } from 'ethers';
import { Account } from '@utils/account';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';
import { CoinMarketCap } from '@freeModules/coinMarketCap';

//https://syncswap.gitbook.io/syncswap/smart-contracts/smart-contracts
const SYNCSWAP_ROUTER_CONTRACT_ADDRESSES = new Map([
	[ChainId.ZksyncEra, '0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295'],
	[ChainId.Linea, '0x80e38291e06339d10aab483c65695d004dbd5c69'],
	[ChainId.Scroll, '0x80e38291e06339d10AAB483C65695D004dBD5C69'],
]);

const SYNCSWAP_CLASSICPOOL_CONTRACT_ADDRESSES = new Map([
	[ChainId.ZksyncEra, '0xf2DAd89f2788a8CD54625C60b55cD3d2D0ACa7Cb'],
	[ChainId.Linea, '0x37BAc764494c8db4e54BDE72f6965beA9fa0AC2d'],
	[ChainId.Scroll, '0x37BAc764494c8db4e54BDE72f6965beA9fa0AC2d'],
]);

export abstract class Syncswap {
	static async swap(
		ACCOUNT: Account,
		network: Network,
		cmcApiKey: string,
		tokenSymbol1: string,
		tokenSymbol2: string,
		amountOfToken1?: string,
		slippageInPercent = 1,
	) {
		if (!ACCOUNT.wallets?.evm?.address) throw new Error('There is no account.wallets.evm.address!');
		if (!ACCOUNT.wallets.evm.private) throw new Error('There is no account.wallets.evm.private in wallet!');

		const token1 = network.tokens.find((t) => t.symbol === tokenSymbol1);
		const token2 = network.tokens.find((t) => t.symbol === tokenSymbol2);
		const wethToken = network.tokens.find((t) => t.symbol === 'WETH');
		if (!token1 || !token2 || !wethToken)
			throw new Error(`There is no ${tokenSymbol1} or ${tokenSymbol2} in network tokens!`);

		const decimals1 = await Evm.getDecimals(network, token1);
		const decimals2 = await Evm.getDecimals(network, token2);

		const balance = await Evm.getBalance(network, ACCOUNT.wallets.evm.address, token1.symbol);
		if (balance === BigInt(0)) throw new Error(`Balance of ${token1.symbol} is 0!`);
		const amountBn = amountOfToken1 ? ethers.parseUnits(amountOfToken1.toString(), decimals1) : balance;
		const amount = ethers.formatUnits(amountBn, decimals1);
		if (balance < amountBn) {
			throw new Error(
				`Balance (${ethers.formatUnits(
					balance,
					decimals1,
				)} ${tokenSymbol1}) is less than amount (${amount} ${tokenSymbol1})!`,
			);
		}
		const routerContractAddress = SYNCSWAP_ROUTER_CONTRACT_ADDRESSES.get(network.chainId);
		const classicPoolContractAddress = SYNCSWAP_CLASSICPOOL_CONTRACT_ADDRESSES.get(network.chainId);
		if (!routerContractAddress || !classicPoolContractAddress) throw new Error();

		if (tokenSymbol1 !== 'ETH') {
			await Evm.approve(network, ACCOUNT.wallets.evm.private, routerContractAddress, tokenSymbol1, amount);
		}

		await Logger.getInstance().log(`Start swapping ${amount} ${tokenSymbol1} to ${tokenSymbol2} on Syncswap ...`);

		const contract = new ethers.Interface(ROUTER_ABI);

		const prices = await CoinMarketCap.getTokensPrices([tokenSymbol1, tokenSymbol2], cmcApiKey);
		const price1 = prices.find((p) => p.symbol === tokenSymbol1);
		const price2 = prices.find((p) => p.symbol === tokenSymbol2);
		if (!price1 || !price2) throw new Error(`Couldnt get prices for ${tokenSymbol1} or ${tokenSymbol2}`);

		const rate = price1.price / price2.price;
		const minAmountOfToken2 = (+amount * rate * (1 - slippageInPercent / 100)).toFixed(decimals2);
		const minAmountOfToken2Bn = ethers.parseUnits(minAmountOfToken2, decimals2);

		const provider = network.getProvider();
		const poolContract = new ethers.Contract(classicPoolContractAddress, CLASSICPOOL_ABI, provider);
		const tokenAddress1 = tokenSymbol1 === 'ETH' ? wethToken.address : token1.address;
		const tokenAddress2 = tokenSymbol2 === 'ETH' ? wethToken.address : token2.address;
		const poolAddress = await poolContract.getPool(tokenAddress1, tokenAddress2);
		const steps = [
			{
				pool: poolAddress,
				data: new ethers.AbiCoder().encode(
					['address', 'address', 'uint8'],
					[tokenAddress1, ACCOUNT.wallets.evm.address, 1],
				),
				callback: ethers.ZeroAddress,
				callbackData: '0x',
			},
		];
		const paths = [
			{
				steps,
				tokenIn: token1.address,
				amountIn: amountBn,
			},
		];

		const deadline = Math.floor(Date.now() + 60000);

		const data = contract.encodeFunctionData('swap', [paths, minAmountOfToken2Bn, deadline]);

		const value = tokenSymbol1 === 'ETH' ? amountBn : BigInt(0);

		const transaction = await Evm.generateTransactionRequest(
			provider,
			ACCOUNT.wallets.evm.private,
			routerContractAddress,
			value,
			data,
		);

		await Evm.makeTransaction(provider, ACCOUNT.wallets.evm.private, transaction);

		await Logger.getInstance().log(
			`${amount} ${tokenSymbol1} swapped for minimum ${minAmountOfToken2} ${tokenSymbol2} on Syncswap.`,
		);
	}
}

const ROUTER_ABI = [
	{
		inputs: [
			{
				internalType: 'address',
				name: '_vault',
				type: 'address',
			},
			{
				internalType: 'address',
				name: '_wETH',
				type: 'address',
			},
		],
		stateMutability: 'nonpayable',
		type: 'constructor',
	},
	{
		inputs: [],
		name: 'ApproveFailed',
		type: 'error',
	},
	{
		inputs: [],
		name: 'Expired',
		type: 'error',
	},
	{
		inputs: [],
		name: 'NotEnoughLiquidityMinted',
		type: 'error',
	},
	{
		inputs: [],
		name: 'TooLittleReceived',
		type: 'error',
	},
	{
		inputs: [],
		name: 'TransferFromFailed',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct SyncSwapRouter.TokenInput[]',
				name: 'inputs',
				type: 'tuple[]',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
			{
				internalType: 'uint256',
				name: 'minLiquidity',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'callback',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'callbackData',
				type: 'bytes',
			},
		],
		name: 'addLiquidity',
		outputs: [
			{
				internalType: 'uint256',
				name: 'liquidity',
				type: 'uint256',
			},
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct SyncSwapRouter.TokenInput[]',
				name: 'inputs',
				type: 'tuple[]',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
			{
				internalType: 'uint256',
				name: 'minLiquidity',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'callback',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'callbackData',
				type: 'bytes',
			},
		],
		name: 'addLiquidity2',
		outputs: [
			{
				internalType: 'uint256',
				name: 'liquidity',
				type: 'uint256',
			},
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct SyncSwapRouter.TokenInput[]',
				name: 'inputs',
				type: 'tuple[]',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
			{
				internalType: 'uint256',
				name: 'minLiquidity',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'callback',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'callbackData',
				type: 'bytes',
			},
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'approveAmount',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'deadline',
						type: 'uint256',
					},
					{
						internalType: 'uint8',
						name: 'v',
						type: 'uint8',
					},
					{
						internalType: 'bytes32',
						name: 'r',
						type: 'bytes32',
					},
					{
						internalType: 'bytes32',
						name: 's',
						type: 'bytes32',
					},
				],
				internalType: 'struct IRouter.SplitPermitParams[]',
				name: 'permits',
				type: 'tuple[]',
			},
		],
		name: 'addLiquidityWithPermit',
		outputs: [
			{
				internalType: 'uint256',
				name: 'liquidity',
				type: 'uint256',
			},
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct SyncSwapRouter.TokenInput[]',
				name: 'inputs',
				type: 'tuple[]',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
			{
				internalType: 'uint256',
				name: 'minLiquidity',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'callback',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'callbackData',
				type: 'bytes',
			},
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'approveAmount',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'deadline',
						type: 'uint256',
					},
					{
						internalType: 'uint8',
						name: 'v',
						type: 'uint8',
					},
					{
						internalType: 'bytes32',
						name: 'r',
						type: 'bytes32',
					},
					{
						internalType: 'bytes32',
						name: 's',
						type: 'bytes32',
					},
				],
				internalType: 'struct IRouter.SplitPermitParams[]',
				name: 'permits',
				type: 'tuple[]',
			},
		],
		name: 'addLiquidityWithPermit2',
		outputs: [
			{
				internalType: 'uint256',
				name: 'liquidity',
				type: 'uint256',
			},
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'liquidity',
				type: 'uint256',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
			{
				internalType: 'uint256[]',
				name: 'minAmounts',
				type: 'uint256[]',
			},
			{
				internalType: 'address',
				name: 'callback',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'callbackData',
				type: 'bytes',
			},
		],
		name: 'burnLiquidity',
		outputs: [
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct IPool.TokenAmount[]',
				name: 'amounts',
				type: 'tuple[]',
			},
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'liquidity',
				type: 'uint256',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
			{
				internalType: 'uint256',
				name: 'minAmount',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'callback',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'callbackData',
				type: 'bytes',
			},
		],
		name: 'burnLiquiditySingle',
		outputs: [
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct IPool.TokenAmount',
				name: 'amountOut',
				type: 'tuple',
			},
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'liquidity',
				type: 'uint256',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
			{
				internalType: 'uint256',
				name: 'minAmount',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'callback',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'callbackData',
				type: 'bytes',
			},
			{
				components: [
					{
						internalType: 'uint256',
						name: 'approveAmount',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'deadline',
						type: 'uint256',
					},
					{
						internalType: 'bytes',
						name: 'signature',
						type: 'bytes',
					},
				],
				internalType: 'struct IRouter.ArrayPermitParams',
				name: 'permit',
				type: 'tuple',
			},
		],
		name: 'burnLiquiditySingleWithPermit',
		outputs: [
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct IPool.TokenAmount',
				name: 'amountOut',
				type: 'tuple',
			},
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'liquidity',
				type: 'uint256',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
			{
				internalType: 'uint256[]',
				name: 'minAmounts',
				type: 'uint256[]',
			},
			{
				internalType: 'address',
				name: 'callback',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'callbackData',
				type: 'bytes',
			},
			{
				components: [
					{
						internalType: 'uint256',
						name: 'approveAmount',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'deadline',
						type: 'uint256',
					},
					{
						internalType: 'bytes',
						name: 'signature',
						type: 'bytes',
					},
				],
				internalType: 'struct IRouter.ArrayPermitParams',
				name: 'permit',
				type: 'tuple',
			},
		],
		name: 'burnLiquidityWithPermit',
		outputs: [
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct IPool.TokenAmount[]',
				name: 'amounts',
				type: 'tuple[]',
			},
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '_factory',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
		],
		name: 'createPool',
		outputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: '',
				type: 'uint256',
			},
		],
		name: 'enteredPools',
		outputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'account',
				type: 'address',
			},
		],
		name: 'enteredPoolsLength',
		outputs: [
			{
				internalType: 'uint256',
				name: '',
				type: 'uint256',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		name: 'isPoolEntered',
		outputs: [
			{
				internalType: 'bool',
				name: '',
				type: 'bool',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'bytes[]',
				name: 'data',
				type: 'bytes[]',
			},
		],
		name: 'multicall',
		outputs: [
			{
				internalType: 'bytes[]',
				name: 'results',
				type: 'bytes[]',
			},
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'value',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'deadline',
				type: 'uint256',
			},
			{
				internalType: 'uint8',
				name: 'v',
				type: 'uint8',
			},
			{
				internalType: 'bytes32',
				name: 'r',
				type: 'bytes32',
			},
			{
				internalType: 'bytes32',
				name: 's',
				type: 'bytes32',
			},
		],
		name: 'selfPermit',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'value',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'deadline',
				type: 'uint256',
			},
			{
				internalType: 'bytes',
				name: 'signature',
				type: 'bytes',
			},
		],
		name: 'selfPermit2',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'value',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'deadline',
				type: 'uint256',
			},
			{
				internalType: 'bytes',
				name: 'signature',
				type: 'bytes',
			},
		],
		name: 'selfPermit2IfNecessary',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'nonce',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'expiry',
				type: 'uint256',
			},
			{
				internalType: 'uint8',
				name: 'v',
				type: 'uint8',
			},
			{
				internalType: 'bytes32',
				name: 'r',
				type: 'bytes32',
			},
			{
				internalType: 'bytes32',
				name: 's',
				type: 'bytes32',
			},
		],
		name: 'selfPermitAllowed',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'nonce',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'expiry',
				type: 'uint256',
			},
			{
				internalType: 'uint8',
				name: 'v',
				type: 'uint8',
			},
			{
				internalType: 'bytes32',
				name: 'r',
				type: 'bytes32',
			},
			{
				internalType: 'bytes32',
				name: 's',
				type: 'bytes32',
			},
		],
		name: 'selfPermitAllowedIfNecessary',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'value',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'deadline',
				type: 'uint256',
			},
			{
				internalType: 'uint8',
				name: 'v',
				type: 'uint8',
			},
			{
				internalType: 'bytes32',
				name: 'r',
				type: 'bytes32',
			},
			{
				internalType: 'bytes32',
				name: 's',
				type: 'bytes32',
			},
		],
		name: 'selfPermitIfNecessary',
		outputs: [],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'stakingPool',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'onBehalf',
				type: 'address',
			},
		],
		name: 'stake',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						components: [
							{
								internalType: 'address',
								name: 'pool',
								type: 'address',
							},
							{
								internalType: 'bytes',
								name: 'data',
								type: 'bytes',
							},
							{
								internalType: 'address',
								name: 'callback',
								type: 'address',
							},
							{
								internalType: 'bytes',
								name: 'callbackData',
								type: 'bytes',
							},
						],
						internalType: 'struct IRouter.SwapStep[]',
						name: 'steps',
						type: 'tuple[]',
					},
					{
						internalType: 'address',
						name: 'tokenIn',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amountIn',
						type: 'uint256',
					},
				],
				internalType: 'struct IRouter.SwapPath[]',
				name: 'paths',
				type: 'tuple[]',
			},
			{
				internalType: 'uint256',
				name: 'amountOutMin',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'deadline',
				type: 'uint256',
			},
		],
		name: 'swap',
		outputs: [
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct IPool.TokenAmount',
				name: 'amountOut',
				type: 'tuple',
			},
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						components: [
							{
								internalType: 'address',
								name: 'pool',
								type: 'address',
							},
							{
								internalType: 'bytes',
								name: 'data',
								type: 'bytes',
							},
							{
								internalType: 'address',
								name: 'callback',
								type: 'address',
							},
							{
								internalType: 'bytes',
								name: 'callbackData',
								type: 'bytes',
							},
						],
						internalType: 'struct IRouter.SwapStep[]',
						name: 'steps',
						type: 'tuple[]',
					},
					{
						internalType: 'address',
						name: 'tokenIn',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amountIn',
						type: 'uint256',
					},
				],
				internalType: 'struct IRouter.SwapPath[]',
				name: 'paths',
				type: 'tuple[]',
			},
			{
				internalType: 'uint256',
				name: 'amountOutMin',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'deadline',
				type: 'uint256',
			},
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'approveAmount',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'deadline',
						type: 'uint256',
					},
					{
						internalType: 'uint8',
						name: 'v',
						type: 'uint8',
					},
					{
						internalType: 'bytes32',
						name: 'r',
						type: 'bytes32',
					},
					{
						internalType: 'bytes32',
						name: 's',
						type: 'bytes32',
					},
				],
				internalType: 'struct IRouter.SplitPermitParams',
				name: 'permit',
				type: 'tuple',
			},
		],
		name: 'swapWithPermit',
		outputs: [
			{
				components: [
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
				],
				internalType: 'struct IPool.TokenAmount',
				name: 'amountOut',
				type: 'tuple',
			},
		],
		stateMutability: 'payable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'vault',
		outputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'wETH',
		outputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
];

const CLASSICPOOL_ABI = [
	{
		inputs: [
			{
				internalType: 'address',
				name: '_master',
				type: 'address',
			},
		],
		stateMutability: 'nonpayable',
		type: 'constructor',
	},
	{
		inputs: [],
		name: 'InvalidTokens',
		type: 'error',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'token0',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'token1',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
		],
		name: 'PoolCreated',
		type: 'event',
	},
	{
		inputs: [
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
		],
		name: 'createPool',
		outputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'getDeployData',
		outputs: [
			{
				internalType: 'bytes',
				name: 'deployData',
				type: 'bytes',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		name: 'getPool',
		outputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'pool',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'sender',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'tokenIn',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'tokenOut',
				type: 'address',
			},
			{
				internalType: 'bytes',
				name: 'data',
				type: 'bytes',
			},
		],
		name: 'getSwapFee',
		outputs: [
			{
				internalType: 'uint24',
				name: 'swapFee',
				type: 'uint24',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'master',
		outputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
];
