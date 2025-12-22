import { ethers } from 'ethers';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network, Token } from '@utils/network';
import axios from 'axios';
import { delay } from '@src/utils/delay';

const JAM_SETTLEMENT_ADDRESS = '0xbeb0b0623f66bE8cE162EbDfA2ec543A522F4ea6';

const BEBOP_API_BASE_URL = 'https://api.bebop.xyz/jam';

const CHAIN_NAME_MAP = new Map([
	[ChainId.Ethereum, 'ethereum'],
	[ChainId.Polygon, 'polygon'],
	[ChainId.Arbitrum, 'arbitrum'],
	[ChainId.Base, 'base'],
	[ChainId.Optimism, 'optimism'],
	[ChainId.Bsc, 'bsc'],
	[ChainId.AvalancheC, 'avalanche'],
	[ChainId.HyperEVM, 'hyperevm'],
]);

const JAM_ORDER_TYPES = {
	JamOrder: [
		{ name: 'taker', type: 'address' },
		{ name: 'receiver', type: 'address' },
		{ name: 'expiry', type: 'uint256' },
		{ name: 'exclusivityDeadline', type: 'uint256' },
		{ name: 'nonce', type: 'uint256' },
		{ name: 'executor', type: 'address' },
		{ name: 'partnerInfo', type: 'uint256' },
		{ name: 'sellTokens', type: 'address[]' },
		{ name: 'buyTokens', type: 'address[]' },
		{ name: 'sellAmounts', type: 'uint256[]' },
		{ name: 'buyAmounts', type: 'uint256[]' },
		{ name: 'hooksHash', type: 'bytes32' },
	],
};

export abstract class Bebop {
	static async swap(
		privateKey: string,
		network: Network,
		tokenSymbol1: string,
		tokenSymbol2: string,
		amountOfToken1?: string,
		slippageInPercent = 1,
		minAmountForSwap?: number,
	) {
		const wallet = new ethers.Wallet(privateKey);
		const logger = Logger.getInstance();

		const token1 = network.tokens.find((t) => t.symbol === tokenSymbol1);
		const token2 = network.tokens.find((t) => t.symbol === tokenSymbol2);

		if (!token1 || !token2) {
			throw new Error(`There is no ${tokenSymbol1} or ${tokenSymbol2} in network tokens!`);
		}

		const decimals1 = await Evm.getDecimals(network, token1);
		const decimals2 = await Evm.getDecimals(network, token2);

		const balance = await Evm.getBalance(network, wallet.address, token1.symbol);

		if (!amountOfToken1 && minAmountForSwap) {
			if (balance < ethers.parseUnits(minAmountForSwap.toFixed(decimals1), decimals1)) {
				await logger.log(
					`Balance (${ethers.formatUnits(balance, decimals1)} ${token1.symbol}) is less than min amount for swap (${minAmountForSwap} ${token1.symbol})`,
				);
				return;
			}
		}

		const amountBn = amountOfToken1 ? ethers.parseUnits((+amountOfToken1).toFixed(decimals1), decimals1) : balance;
		const amount = ethers.formatUnits(amountBn, decimals1);

		if (balance < amountBn) {
			throw new Error(
				`Balance (${ethers.formatUnits(balance, decimals1)} ${tokenSymbol1}) is less than amount (${amount} ${tokenSymbol1})!`,
			);
		}

		await logger.log(`Start swapping ${amount} ${tokenSymbol1} to ${tokenSymbol2} on Bebop (JAM) ...`);

		try {
			const quote = await Bebop._getQuote(wallet.address, network, token1, token2, amountBn.toString(), slippageInPercent);
			console.log(quote);

			if (quote.error) {
				throw new Error(`Bebop quote error: ${JSON.stringify(quote.error)}`);
			}

			await Evm.approve(network, privateKey, quote.approvalTarget, tokenSymbol1, amount);

			const signature = await Bebop._signOrder(wallet, network, quote);

			const response = await Bebop._submitOrder(network, quote.quoteId, signature);

			if (response.error) {
				throw new Error(`Bebop order error: ${JSON.stringify(response.error.message)}`);
			}

			console.log(response);

			let status;
			while (status !== 'Confirmed' || status !== 'Failed') {
				await delay(1);
				const stResp = await Bebop._getOrderStatus(network, quote.quoteId);
				status = stResp.status;
			}
			if (status === 'Confirmed')
				await logger.log(
					`${amount} ${tokenSymbol1} swapped for ~${ethers.formatUnits(quote.toSign.buyAmounts[0], decimals2)} ${tokenSymbol2} on Bebop. TxHash: ${response.txHash || 'pending'}`,
				);
			else {
				throw new Error(`Bebop order failed. Status: ${status}`);
			}

			return response;
		} catch (e: any) {
			if (e.toString().includes('Request failed with status code 403')) {
				throw new Error(`Couldn't connect to Bebop from restricted territory. Use proxy or VPN.\n${e}`);
			}
			throw e;
		}
	}

	private static async _getQuote(
		address: string,
		network: Network,
		tokenFrom: Token,
		tokenTo: Token,
		amount: string,
		slippageInPercent: number,
	) {
		const chainName = CHAIN_NAME_MAP.get(network.chainId);
		if (!chainName) {
			throw new Error(`Bebop doesn't support chain ${network.name} (chainId: ${network.chainId})`);
		}

		const url = `${BEBOP_API_BASE_URL}/${chainName}/v2/quote`;

		if (tokenTo.symbol === network.nativeCoin || tokenFrom.symbol === network.nativeCoin) {
			const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
			if (tokenFrom.symbol === network.nativeCoin) tokenFrom.address = NATIVE_TOKEN_ADDRESS;
			if (tokenTo.symbol === network.nativeCoin) tokenTo.address = NATIVE_TOKEN_ADDRESS;
		}

		const tokenFromChecksummed = ethers.getAddress(tokenFrom.address);
		const tokenToChecksummed = ethers.getAddress(tokenTo.address);

		// Для нативных токенов может потребоваться другой approval_type
		const isSendingNative = tokenFrom.symbol === network.nativeCoin;

		const resp = await axios.get(url, {
			params: {
				buy_tokens: tokenToChecksummed,
				sell_tokens: tokenFromChecksummed,
				sell_amounts: amount,
				taker_address: address,
				approval_type: isSendingNative ? undefined : 'Standard',
				slippage: slippageInPercent,
			},
		});

		return resp.data;
	}

	private static async _signOrder(wallet: ethers.Wallet, network: Network, quote: any): Promise<string> {
		const domain = {
			name: 'JamSettlement',
			version: '2',
			chainId: network.chainId,
			verifyingContract: JAM_SETTLEMENT_ADDRESS,
		};

		const signature = await wallet.signTypedData(domain, JAM_ORDER_TYPES, quote.toSign);

		return signature;
	}

	private static async _submitOrder(network: Network, quoteId: string, signature: string) {
		const chainName = CHAIN_NAME_MAP.get(network.chainId);
		if (!chainName) {
			throw new Error(`Bebop doesn't support chain ${network.name} (chainId: ${network.chainId})`);
		}

		const url = `${BEBOP_API_BASE_URL}/${chainName}/v2/order`;

		const resp = await axios.post(
			url,
			{
				signature: signature,
				quote_id: quoteId,
			},
			{
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
			},
		);

		return resp.data;
	}

	private static async _getOrderStatus(network: Network, quoteId: string) {
		const chainName = CHAIN_NAME_MAP.get(network.chainId);
		if (!chainName) {
			throw new Error(`Bebop doesn't support chain ${network.name} (chainId: ${network.chainId})`);
		}

		const url = `${BEBOP_API_BASE_URL}/${chainName}/v2/order-status?quote_id=${quoteId}`;

		const resp = await axios.get(url, {
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
			},
		});

		return resp.data;
	}
}
