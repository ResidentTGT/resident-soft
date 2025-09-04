import { ethers } from 'ethers';
import { Logger, MessageType } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';
import axios from 'axios';

const ODOS_ROUTER_CONTRACT_ADDRESSES = new Map([
	[ChainId.ZksyncEra, '0x4bba932e9792a2b917d47830c93a9bc79320e4f7'],
	[ChainId.Arbitrum, '0xa669e7a0d4b3e4fa48af2de86bd4cd7126be4e13'],
	[ChainId.Polygon, '0xa669e7a0d4b3e4fa48af2de86bd4cd7126be4e13'],
	[ChainId.Base, '0x19ceead7105607cd444f5ad10dd51356436095a1'],
	[ChainId.Ethereum, '0xCf5540fFFCdC3d510B18bFcA6d2b9987b0772559'],
	[ChainId.Linea, '0x2d8879046f1559E53eb052E949e9544bCB72f414'],
	[ChainId.Sonic, '0xaC041Df48dF9791B0654f1Dbbf2CC8450C5f2e9D'],
]);

export abstract class Odos {
	static async swap(
		privateKey: string,
		network: Network,
		tokenSymbol1: string,
		tokenSymbol2: string,
		amountOfToken1?: string,
		slippageInPercent = 1,
		minAmountForSwap?: string,
	) {
		const wallet = new ethers.Wallet(privateKey);

		const logger = Logger.getInstance();

		const token1 = network.tokens.find((t) => t.symbol === tokenSymbol1);
		const token2 = network.tokens.find((t) => t.symbol === tokenSymbol2);
		//const wethToken = network.tokens.find((t) => t.symbol === 'WETH');
		if (!token1 || !token2) throw new Error(`There is no ${tokenSymbol1} or ${tokenSymbol2} in network tokens!`);

		const decimals1 = await Evm.getDecimals(network, token1);
		const decimals2 = await Evm.getDecimals(network, token2);

		const balance = await Evm.getBalance(network, wallet.address, token1.symbol);

		if (!amountOfToken1 && minAmountForSwap)
			if (balance < ethers.parseUnits(minAmountForSwap, decimals1)) {
				await logger.log(
					`Balance (${ethers.formatUnits(balance, decimals1)} ${token1.symbol}) is less than min amount for swap (${minAmountForSwap} ${token1.symbol})`,
				);
				return;
			}

		const amountBn = amountOfToken1 ? ethers.parseUnits((+amountOfToken1).toFixed(decimals1), decimals1) : balance;

		const amount = ethers.formatUnits(amountBn, decimals1);
		if (balance < amountBn) {
			throw new Error(
				`Balance (${ethers.formatUnits(
					balance,
					decimals1,
				)} ${tokenSymbol1}) is less than amount (${amount} ${tokenSymbol1})!`,
			);
		}

		if (tokenSymbol1 !== network.nativeCoin) {
			const contractAddress = ODOS_ROUTER_CONTRACT_ADDRESSES.get(network.chainId);
			if (!contractAddress) throw new Error(`There is no contract address for ${ChainId[+network.chainId]}`);
			await Evm.approve(network, privateKey, contractAddress, tokenSymbol1, amount);
		}

		await logger.log(`Start swapping ${amount} ${tokenSymbol1} to ${tokenSymbol2} on Odos ...`);

		const provider = network.getProvider();
		try {
			const quote = await Odos._getQuote(
				wallet.address,
				network,
				token1.address,
				token2.address,
				amountBn.toString(),
				slippageInPercent,
			);

			const transactionResp = (await Odos._getTransactionData(wallet.address, quote.pathId)).transaction;

			const value = tokenSymbol1 === network.nativeCoin ? amountBn : BigInt(0);

			const transaction = await Evm.generateTransactionRequest(
				provider,
				privateKey,
				transactionResp.to,
				value,
				transactionResp.data,
			);
			transaction.maxFeePerGas = transaction.maxFeePerGas
				? BigInt(Math.round(Number(transaction.maxFeePerGas) * 1.2))
				: transaction.maxFeePerGas;
			transaction.maxPriorityFeePerGas = transaction.maxPriorityFeePerGas
				? BigInt(Math.round(Number(transaction.maxPriorityFeePerGas) * 1.2))
				: transaction.maxPriorityFeePerGas;
			transaction.gasPrice = transaction.gasPrice
				? BigInt(Math.round(Number(transaction.gasPrice) * 1.2))
				: transaction.gasPrice;

			await Evm.makeTransaction(provider, privateKey, transaction);

			await logger.log(
				`${amount} ${tokenSymbol1} swapped for ${ethers.formatUnits(
					quote.outAmounts[0],
					decimals2,
				)} ${tokenSymbol2} on Odos.`,
			);
		} catch (e: any) {
			if (e.toString().includes('Request failed with status code 403'))
				await logger.log(`Couldnt connect to Odos from restricted territory. Use proxy or VPN.`, MessageType.Error);

			throw e;
		}
	}

	private static async _getQuote(
		address: string,
		network: Network,
		tokenFrom: string,
		tokenTo: string,
		amount: string,
		slippage: number,
	) {
		const url = 'https://api.odos.xyz/sor/quote/v2';

		const data = {
			chainId: network.chainId,
			inputTokens: [
				{
					tokenAddress: tokenFrom,
					amount: amount,
				},
			],
			outputTokens: [
				{
					tokenAddress: tokenTo,
					proportion: 1,
				},
			],
			slippageLimitPercent: slippage,
			userAddr: address,
			referralCode: 0,
			compact: true,
		};

		const resp = await axios.post(url, data);
		return resp.data;
	}

	private static async _getTransactionData(address: string, pathId: string) {
		const url = 'https://api.odos.xyz/sor/assemble';

		const data = {
			userAddr: address,
			pathId: pathId,
			simulate: false,
		};

		const resp = await axios.post(url, data);
		return resp.data;
	}
}
