import axios from 'axios';
import { Account, Wallet } from '@utils/account';
import { Logger, MessageType } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';

import { ethers } from 'ethers';
import { ERC20_ABI } from '@utils/abi/erc20abi';
import { FusionSDK, PrivateKeyProviderConnector } from '@1inch/fusion-sdk';

const INCH_API_BASE_URL = 'https://api.1inch.io/v5.0/';

export interface Swap1InchParams {
	fromTokenAddress: string;
	toTokenAddress: string;
	amount: string;
	fromAddress: string;
	slippage: number;
	disableEstimate: false;
	allowPartialFill: false;
}

export abstract class _1inch {
	static async swapRpc(
		network: Network,
		account: Account,
		fromTokenSymbol: string,
		toTokenSymbol: string,
		fusion = true,
		amount?: number,
	) {
		if (!account.wallets?.evm?.address || !account.wallets?.evm.private) throw new Error();
		const provider = network.getProvider();

		const fromToken = network.tokens.find((t) => t.symbol === fromTokenSymbol);
		const toToken = network.tokens.find((t) => t.symbol === toTokenSymbol);

		if (!fromToken || !toToken) {
			await Logger.getInstance().log(
				`There is no one of tokens (${fromTokenSymbol}||${toTokenSymbol}) in tokens list of network ${network}`,
				MessageType.Error,
			);
			throw new Error();
		}

		const fromDecimals = await Evm.getDecimals(network, fromToken);
		const toDecimals = await Evm.getDecimals(network, toToken);

		let amountBn;
		if (amount) {
			amountBn = ethers.parseUnits(amount.toString(), fromDecimals);
		} else {
			const contract = new ethers.Contract(fromToken.address, ERC20_ABI, provider);
			amountBn = await contract.balanceOf(account.wallets.evm.address);

			amount = +ethers.formatUnits(amountBn, fromDecimals);
		}

		try {
			if (fusion) {
				const sdk = new FusionSDK({
					url: 'https://fusion.1inch.io',
					network: +network.chainId,
					blockchainProvider: new PrivateKeyProviderConnector(account.wallets.evm.private, provider as any),
				});

				const resp = await sdk.placeOrder({
					fromTokenAddress: fromToken.address,
					toTokenAddress: toToken.address,
					amount: amountBn.toString(),
					walletAddress: account.wallets.evm.address,
				});

				await Logger.getInstance().log(
					`Placed order from ${amount} ${fromTokenSymbol} to minimum ${ethers.formatUnits(
						resp.order.takingAmount,
						toDecimals,
					)} ${toTokenSymbol}`,
					MessageType.Info,
				);
			} else {
				const allowance = BigInt(
					await this.checkAllowance(network.chainId, fromToken.address, account.wallets.evm.address),
				);

				if (allowance < amountBn) {
					await Logger.getInstance().log(
						`Allowance(${ethers.formatUnits(
							allowance,
							fromDecimals,
						)}) is less than amount(${amount}). Start approving ${fromTokenSymbol}...`,
					);
					const resp = await this.approve(provider, account.wallets.evm, fromToken.address);
					await Logger.getInstance().log(`Approving transaction succeed. Hash: ${resp.hash}`);
				}

				const swapParams: Swap1InchParams = {
					amount: amountBn.toString(),
					fromAddress: account.wallets.evm.address,
					fromTokenAddress: fromToken.address,
					toTokenAddress: toToken.address,
					allowPartialFill: false,
					disableEstimate: false,
					slippage: 1,
				};

				const swapResp: any = (
					await axios.get(
						`${INCH_API_BASE_URL}${network.chainId}/swap?${new URLSearchParams(swapParams as any).toString()}`,
					)
				).data;

				const transactionRequest = await Evm.generateTransactionRequest(
					provider,
					account.wallets.evm.private,
					swapResp.tx.to ?? '',
					BigInt(swapResp.tx.value),
					swapResp.tx.data,
				);
				await Evm.makeTransaction(provider, account.wallets.evm.private, transactionRequest);

				await Logger.getInstance().log(
					`Successfully swapped from ${amount} ${fromTokenSymbol} to minimum ${ethers.formatUnits(
						swapResp.toTokenAmount,
						toDecimals,
					)} ${toTokenSymbol}`,
					MessageType.Info,
				);
			}
		} catch (e: any) {
			const message = e.response.data ?? e;
			await Logger.getInstance().log(`Error during swapping!\n${JSON.stringify(message)}`, MessageType.Error);
			throw new Error();
		}
	}

	static async checkAllowance(chainId: ChainId, tokenAddress: string, walletAddress: string): Promise<string> {
		return axios
			.get(`${INCH_API_BASE_URL}${chainId}/approve/allowance?tokenAddress=${tokenAddress}&walletAddress=${walletAddress}`)
			.then((res) => res.data.allowance);
	}

	static async approve(provider: ethers.Provider, account: Wallet, tokenAddress: string): Promise<ethers.TransactionResponse> {
		if (!account.private) throw new Error(`There is no account.private in wallet!`);
		const network = +(await provider.getNetwork()).chainId.toString();

		const transactionRequestResp: ethers.TransactionRequest = await axios
			.get(`${INCH_API_BASE_URL}${network}/approve/transaction?tokenAddress=${tokenAddress}`)
			.then((res) => res.data);

		if (!transactionRequestResp.data) throw new Error();
		const transactionRequest = await Evm.generateTransactionRequest(
			provider,
			account.private,
			tokenAddress,
			BigInt(0),
			transactionRequestResp.data,
		);

		const resp = await Evm.makeTransaction(provider, account.private, transactionRequest);

		return resp;
	}
}
