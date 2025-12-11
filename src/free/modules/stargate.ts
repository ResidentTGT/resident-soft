import { Account } from '@utils/account';
import { MissingFieldError } from '@src/utils/errors';
import { ChainId, Network, Token } from '@utils/network';
import { Logger, MessageType } from '@utils/logger';
import { Evm } from './evm';
import axios from 'axios';
import { ethers } from 'ethers';
import Random from '@src/utils/random';

// Stargate API base URL
const STARGATE_API_BASE = 'https://stargate.finance/api/v1';

// Native ETH address used by Stargate API
const NATIVE_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Mapping of chainIds to Stargate chain keys
const CHAIN_ID_TO_KEY: Record<string, string> = {
	[ChainId.Ethereum]: 'ethereum',
	[ChainId.Arbitrum]: 'arbitrum',
	[ChainId.Optimism]: 'optimism',
	[ChainId.Base]: 'base',
	[ChainId.Polygon]: 'polygon',
	[ChainId.AvalancheC]: 'avalanche',
	[ChainId.Bsc]: 'bsc',
	[ChainId.Scroll]: 'scroll',
	[ChainId.Linea]: 'linea',
	[ChainId.Mantle]: 'mantle',
	[ChainId.Metis]: 'metis',
	[ChainId.Gnosis]: 'gnosis',
	[ChainId.Abstract]: 'abstract',
	[ChainId.Ape]: 'ape',
	[ChainId.ApexFusionNexus]: 'apexfusionnexus',
	[ChainId.Aptos]: 'aptos',
	[ChainId.Astar]: 'astar',
	[ChainId.Aurora]: 'aurora',
	[ChainId.Berachain]: 'bera',
	[ChainId.Blast]: 'blast',
	[ChainId.Bob]: 'bob',
	[ChainId.Botanix]: 'botanix',
	[ChainId.Camp]: 'camp',
	[ChainId.Celo]: 'celo',
	[ChainId.Conflux]: 'conflux',
	[ChainId.Core]: 'coredao',
	[ChainId.Cronos]: 'cronosevm',
	[ChainId.Cyber]: 'cyber',
	[ChainId.Degen]: 'degen',
	[ChainId.Doma]: 'doma',
	[ChainId.Edu]: 'edu',
	[ChainId.Ethereal]: 'ethereal',
	[ChainId.Etherlink]: 'etherlink',
	[ChainId.Fantom]: 'fantom',
	[ChainId.Flare]: 'flare',
	[ChainId.Flow]: 'flow',
	[ChainId.Fraxtal]: 'fraxtal',
	[ChainId.Fuse]: 'fuse',
	[ChainId.Glue]: 'glue',
	[ChainId.Goat]: 'goat',
	[ChainId.Gravity]: 'gravity',
	[ChainId.Hedera]: 'hedera',
	[ChainId.Hemi]: 'hemi',
	[ChainId.HyperEVM]: 'hyperliquid',
	[ChainId.Ink]: 'ink',
	[ChainId.Iota]: 'iota',
	[ChainId.Islander]: 'islander',
	[ChainId.Katana]: 'katana',
	[ChainId.Kava]: 'kava',
	[ChainId.Klaytn]: 'klaytn',
	[ChainId.LightLink]: 'lightlink',
	[ChainId.Lisk]: 'lisk',
	[ChainId.MantaPacific]: 'manta',
	[ChainId.Mode]: 'mode',
	[ChainId.Monad]: 'monad',
	[ChainId.Moonbeam]: 'moonbeam',
	[ChainId.Moonriver]: 'moonriver',
	[ChainId.Morph]: 'morph',
	[ChainId.Nibiru]: 'nibiru',
	[ChainId.Og]: 'og',
	[ChainId.OpBNB]: 'opbnb',
	[ChainId.Orderly]: 'orderly',
	[ChainId.Peaq]: 'peaq',
	[ChainId.Plasma]: 'plasma',
	[ChainId.PlumePhoenix]: 'plumephoenix',
	[ChainId.PolygonZkEVM]: 'zkevm',
	[ChainId.Rarible]: 'rarible',
	[ChainId.Rootstock]: 'rootstock',
	[ChainId.Sanko]: 'sanko',
	[ChainId.Sei]: 'sei',
	[ChainId.Solana]: 'solana',
	[ChainId.Somnia]: 'somnia',
	[ChainId.Sonic]: 'sonic',
	[ChainId.Soneium]: 'soneium',
	[ChainId.Sophon]: 'sophon',
	[ChainId.Stable]: 'stable',
	[ChainId.Story]: 'story',
	[ChainId.Sui]: 'sui',
	[ChainId.Superposition]: 'superposition',
	[ChainId.Swell]: 'swell',
	[ChainId.Tac]: 'tac',
	[ChainId.Taiko]: 'taiko',
	[ChainId.Telos]: 'telos',
	[ChainId.Ton]: 'ton',
	[ChainId.Tron]: 'tron',
	[ChainId.Unichain]: 'unichain',
	[ChainId.Viction]: 'tomo',
	[ChainId.World]: 'worldchain',
	[ChainId.Xdc]: 'xdc',
	[ChainId.XLayer]: 'xlayer',
	[ChainId.Xpla]: 'xpla',
	[ChainId.ZkVerify]: 'zkverify',
	[ChainId.ZksyncEra]: 'zksync',
	[ChainId.Zircuit]: 'zircuit',
	[ChainId.Zora]: 'zora',
};

interface StargateChain {
	chainKey: string;
	chainType: string;
	chainId: number;
	shortName: string;
	name: string;
	nativeCurrency: {
		chainKey: string;
		name: string;
		symbol: string;
		decimals: number;
		address: string;
	};
}

interface StargateStep {
	type: string;
	sender: string;
	chainKey: string;
	transaction: {
		to: string;
		from: string;
		data: string;
		value?: string;
		chainId: number;
	};
}

interface StargateFee {
	token: string;
	amount: string;
	type: string;
	chainKey: string;
}

interface StargateRoute {
	bridge: string;
	error: string | null;
	srcAmount: string;
	dstAmount: string;
	srcAmountMax: string;
	duration: {
		estimated: number;
	};
	allowance: string;
	dstNativeAmount: string;
	fees: StargateFee[];
	steps: StargateStep[];
}

interface StargateQuoteResponse {
	quotes: StargateRoute[];
}

export abstract class Stargate {
	/**
	 * Get Stargate chain key from chainId
	 */
	private static getChainKey(chainId: ChainId): string {
		const chainKey = CHAIN_ID_TO_KEY[chainId];
		if (!chainKey) {
			throw new Error(`Unsupported chain ${chainId} for Stargate bridge`);
		}
		return chainKey;
	}

	/**
	 * Get token address for Stargate API
	 * Returns native ETH address for native coins, otherwise token contract address
	 */
	private static getTokenAddress(network: Network, token: Token): string {
		if (token.symbol === network.nativeCoin) {
			return NATIVE_ETH_ADDRESS;
		}
		return token.address;
	}

	/**
	 * Fetch available chains from Stargate API
	 */
	static async getChains(): Promise<StargateChain[]> {
		try {
			const response = await axios.get<{ chains: StargateChain[] }>(`${STARGATE_API_BASE}/chains`);
			return response.data.chains;
		} catch (error: unknown) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to fetch Stargate chains: ${errorMsg}`);
		}
	}

	/**
	 * Get quote for bridge transaction from Stargate API
	 */
	private static async getQuote(
		srcNetwork: Network,
		srcToken: Token,
		srcAmount: string,
		dstNetwork: Network,
		dstToken: Token,
		address: string,
		slippagePercent = 0.5,
	): Promise<StargateRoute> {
		const logger = await Logger.getInstance();

		const srcChainKey = this.getChainKey(srcNetwork.chainId);
		const dstChainKey = this.getChainKey(dstNetwork.chainId);
		const srcTokenAddress = this.getTokenAddress(srcNetwork, srcToken);
		const dstTokenAddress = this.getTokenAddress(dstNetwork, dstToken);

		// Get token decimals
		const srcDecimals = await Evm.getDecimals(srcNetwork, srcToken);

		// Convert amount to smallest unit
		const srcAmountBn = ethers.parseUnits(srcAmount, srcDecimals);

		// Calculate minimum destination amount with slippage
		const dstAmountMin = (srcAmountBn * BigInt(Math.floor((100 - slippagePercent) * 100))) / BigInt(10000);

		try {
			const response = await axios.get<StargateQuoteResponse>(`${STARGATE_API_BASE}/quotes`, {
				params: {
					srcToken: srcTokenAddress,
					dstToken: dstTokenAddress,
					srcAddress: address,
					dstAddress: address,
					srcChainKey,
					dstChainKey,
					srcAmount: srcAmountBn.toString(),
					dstAmountMin: dstAmountMin.toString(),
				},
			});

			if (!response.data.quotes || response.data.quotes.length === 0) {
				throw new Error('No routes available for this bridge transaction');
			}

			// Get the first (best) route
			const route = response.data.quotes[0];

			if (route.error) {
				throw new Error(`Stargate quote error: ${route.error}`);
			}

			if (route.fees && route.fees.length > 0) {
				await logger.log('Fees:');
				for (const fee of route.fees) {
					await logger.log(`  ${fee.type}: ${fee.amount} on ${fee.chainKey}`, MessageType.Trace);
				}
			}

			return route;
		} catch (error: any) {
			const statusText = error?.response?.statusText;

			let errorMsg;

			if (statusText && statusText === 'Unprocessable Entity') {
				errorMsg = `no route from ${srcAmount} ${srcToken.symbol} (${srcNetwork.name}) to ${dstToken.symbol} (${dstNetwork.name})`;
			}

			throw new Error(`Failed to get Stargate quote: ${errorMsg ?? error}`);
		}
	}

	/**
	 * Execute a bridge transaction step
	 */
	private static async executeStep(step: StargateStep, privateKey: string, network: Network): Promise<void> {
		const logger = await Logger.getInstance();
		const provider = network.getProvider();

		await logger.log(`Executing ${step.type} step on ${network.name}...`);

		const transactionRequest = await Evm.generateTransactionRequest(
			provider,
			privateKey,
			step.transaction.to,
			step.transaction.value ? BigInt(step.transaction.value) : BigInt(0),
			step.transaction.data,
		);

		await Evm.makeTransaction(provider, privateKey, transactionRequest);
	}

	/**
	 * Calculate bridge amount based on parameters
	 * Priority: if amount is set (at least one value !== 0), use amount. Otherwise use minBalanceToKeep.
	 */
	private static calculateBridgeAmount(
		balance: number,
		decimals: number,
		amountRange?: [number | null, number],
		minBalanceToKeep?: [number, number],
	): string {
		// Check if amount is specified (priority mode)
		const hasAmountRange =
			amountRange &&
			Array.isArray(amountRange) &&
			amountRange.length === 2 &&
			amountRange[0] !== null &&
			amountRange[1] !== 0;

		let amount: number;

		if (hasAmountRange && amountRange) {
			// Mode 1: Bridge random amount from range
			const [minAmount, maxAmount] = amountRange;

			if (minAmount === null || minAmount === undefined) {
				throw new Error('Invalid amount range: minimum amount is null or undefined');
			}

			const effectiveMax = Math.min(maxAmount, balance);

			if (minAmount > balance) {
				throw new Error(`Insufficient balance. Have: ${balance}, Need: ${minAmount}`);
			}

			amount = Random.float(minAmount, effectiveMax);
		} else {
			// Mode 2: Bridge all except random keep amount
			if (!minBalanceToKeep || !Array.isArray(minBalanceToKeep) || minBalanceToKeep.length !== 2) {
				throw new Error('minBalanceToKeep [min, max] must be specified when amount is not set');
			}

			const [minKeep, maxKeep] = minBalanceToKeep;
			const keepAmount = Random.float(minKeep, maxKeep);
			amount = balance - keepAmount;

			if (amount <= 0) {
				throw new Error(`Insufficient balance to keep ${keepAmount}. Balance: ${balance}`);
			}
		}

		return amount.toFixed(decimals);
	}

	/**
	 * Validate bridge parameters
	 */
	private static validateBridgeParams(
		srcChainId: ChainId,
		srcTokenSymbol: string,
		dstChainId: ChainId,
		dstTokenSymbol: string,
	): void {
		if (!srcChainId) throw new Error('fromChainId is required');
		if (!dstChainId) throw new Error('toChainId is required');
		if (!srcTokenSymbol) throw new Error('fromToken is required');
		if (!dstTokenSymbol) throw new Error('toToken is required');
	}

	/**
	 * Bridge tokens from one network to another using Stargate
	 *
	 * @param account - Account to use for bridging
	 * @param srcChainId - Source chain ID
	 * @param srcTokenSymbol - Source token symbol
	 * @param dstChainId - Destination chain ID
	 * @param dstTokenSymbol - Destination token symbol
	 * @param amountRange - Amount range [min, max] to bridge. If at least one value !== 0, this mode is used (PRIORITY)
	 * @param minBalanceToKeep - Balance to keep on account [min, max]. Used only if amountRange is [null, 0] or [0, 0]
	 * @param minAmountToBridge - Minimum amount required to execute bridge (0 = no minimum). If calculated amount is less, bridge is skipped
	 * @param slippagePercent - Slippage tolerance percentage (default: 0.5%)
	 */
	static async bridge(
		account: Account,
		srcChainId: ChainId,
		srcTokenSymbol: string,
		dstChainId: ChainId,
		dstTokenSymbol: string,
		amountRange: [number, number],
		minBalanceToKeep: [number, number],
		minAmountToBridge = 0,
		slippagePercent = 0.5,
	): Promise<void> {
		// Validate account has EVM private key
		if (!account.wallets?.evm?.private) {
			throw new MissingFieldError('wallets.evm.private');
		}

		// Validate parameters
		this.validateBridgeParams(srcChainId, srcTokenSymbol, dstChainId, dstTokenSymbol);

		const logger = await Logger.getInstance();
		const privateKey = account.wallets.evm.private;
		const wallet = new ethers.Wallet(privateKey);

		// Get networks and tokens
		const srcNetwork = await Network.getNetworkByChainId(srcChainId);
		const dstNetwork = await Network.getNetworkByChainId(dstChainId);

		const srcToken = srcNetwork.tokens.find((token) => token.symbol === srcTokenSymbol);
		if (!srcToken) {
			throw new Error(`Token ${srcTokenSymbol} not found on ${srcNetwork.name}`);
		}

		const dstToken = dstNetwork.tokens.find((token) => token.symbol === dstTokenSymbol);
		if (!dstToken) {
			throw new Error(`Token ${dstTokenSymbol} not found on ${dstNetwork.name}`);
		}

		// Get balance and decimals
		const decimals = await Evm.getDecimals(srcNetwork, srcToken);
		const balanceBn = await Evm.getBalance(srcNetwork, wallet.address, srcTokenSymbol);
		const balance = +ethers.formatUnits(balanceBn, decimals);

		// Calculate bridge amount
		let amount: string;
		try {
			amount = this.calculateBridgeAmount(balance, decimals, amountRange, minBalanceToKeep);
		} catch (error: unknown) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			throw new Error(`Cannot calculate bridge amount: ${errorMsg}`);
		}

		const amountNum = +amount;

		// Check minimum amount requirement
		if (minAmountToBridge > 0 && amountNum < minAmountToBridge) {
			await logger.log(
				`Bridge amount ${amountNum} ${srcTokenSymbol} is less than minimum ${minAmountToBridge} ${srcTokenSymbol}. Skipping.`,
				MessageType.Warn,
			);
			return;
		}

		await logger.log(
			`Starting Stargate bridge from ${amount} ${srcTokenSymbol} (${srcNetwork.name}) to ${dstTokenSymbol} (${dstNetwork.name}). Slippage: ${slippagePercent}%, Balance: ${balance} ${srcTokenSymbol}`,
		);

		// Get quote from Stargate API
		const route = await this.getQuote(srcNetwork, srcToken, amount, dstNetwork, dstToken, wallet.address, slippagePercent);

		for (let i = 0; i < route.steps.length; i++) {
			const step = route.steps[i];
			await logger.log(`Step ${i + 1}/${route.steps.length}: ${step.type}`);

			const stepNetwork = step.chainKey === this.getChainKey(srcChainId) ? srcNetwork : dstNetwork;
			await this.executeStep(step, privateKey, stepNetwork);
		}

		const dstDecimals = await Evm.getDecimals(dstNetwork, dstToken);
		const expectedAmount = ethers.formatUnits(route.dstAmount, dstDecimals);

		await logger.log(
			`Bridge completed! Expected to receive: ${expectedAmount} ${dstTokenSymbol}. Estimated time: ${route.duration.estimated}s`,
		);
	}
}
