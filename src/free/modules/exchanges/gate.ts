import CryptoJS from 'crypto-js';
import { Logger } from '@utils/logger';
import { ChainId } from '@utils/network';
import axios from 'axios';
import { Cex } from '@utils/account';
import { MissingFieldError } from '@src/utils/errors';

export const GATE_API_URL = 'https://api.gateio.ws';

export class Gate {
	private readonly _account: Cex;

	constructor(cexAccount: Cex) {
		this._account = cexAccount;
	}

	//https://www.gate.io/docs/developers/apiv4/#withdrawal
	async withdraw(to: string, token: string, chainId: ChainId, amount: number): Promise<any> {
		if (!this._account.api?.secretKey) throw new MissingFieldError('mainGateAccount.api.secretKey', false);

		try {
			const withdrawStatus = await this._getWithdrawStatus(token);

			const chain = this._getChain(chainId);
			if (!chain) throw new Error(`Couldnt find chain for ${ChainId[+chainId]}!`);
			const fee = withdrawStatus[0].withdraw_fix_on_chains[chain];
			const minAmount = +withdrawStatus[0].withdraw_amount_mini;
			if (!fee) throw new Error(`Couldnt get fee for ${token} in ${chain}!`);

			const requestUrl = `/api/v4/withdrawals`;

			const amountToWithdraw = (amount + +fee >= minAmount ? amount + +fee : minAmount).toFixed(6);
			const body = {
				currency: token,
				address: to,
				amount: amountToWithdraw,
				chain,
			};

			await axios.post(`${GATE_API_URL}${requestUrl}`, body, {
				headers: this._generateHeaders('POST', requestUrl, body),
			});

			await Logger.getInstance().log(`Withdrawal succeed. ${amountToWithdraw} ${token} to ${to}`);
		} catch (e: any) {
			const errorMsg = e.response?.data?.message;
			throw new Error(`Withdrawal ${amount} ${token} to ${to} failed.\n${errorMsg ?? e}`);
		}
	}

	async _getWithdrawStatus(currency: string): Promise<any> {
		if (!this._account.api?.secretKey) throw new MissingFieldError('mainGateAccount.api.secretKey', false);

		const requestUrl = `/api/v4/wallet/withdraw_status`;
		const queryParam = `currency=${currency}`;

		const response = (
			await axios.get(`${GATE_API_URL}${requestUrl}?${queryParam}`, {
				headers: this._generateHeaders('GET', requestUrl, undefined, queryParam),
			})
		).data;

		return response;
	}

	private _getChain(chainId: ChainId) {
		let chain;
		switch (chainId) {
			case ChainId.Ethereum:
				chain = 'ETH';
				break;
			case ChainId.Bsc:
				chain = 'BSC';
				break;
			case ChainId.Arbitrum:
				chain = 'ARBEVM';
				break;
			case ChainId.ZksyncEra:
				chain = 'ZKSERA';
				break;
			case ChainId.Optimism:
				chain = 'OPETH';
				break;
			case ChainId.Linea:
				chain = 'LINEAETH';
				break;
			case ChainId.Aptos:
				chain = 'APT';
				break;
			case ChainId.AvalancheC:
				chain = 'AVAX_C';
				break;
			case ChainId.Base:
				chain = 'BASEEVM';
				break;
			case ChainId.Berachain:
				chain = 'BERA';
				break;
			case ChainId.Blast:
				chain = 'BLASTETH';
				break;
			case ChainId.Celo:
				chain = 'CELO';
				break;
			case ChainId.Core:
				chain = 'CORE';
				break;
			case ChainId.Flow:
				chain = 'FLOW';
				break;
			case ChainId.HyperEVM:
				chain = 'HYPEEVM';
				break;
			case ChainId.MantaPacific:
				chain = 'MANTAETH';
				break;
			case ChainId.Polygon:
				chain = 'MATIC';
				break;
			case ChainId.Sei:
				chain = 'SEI';
				break;
			case ChainId.Solana:
				chain = 'SOL';
				break;
			case ChainId.Sophon:
				chain = 'SOPH';
				break;
			case ChainId.Sui:
				chain = 'SUI';
				break;
		}

		return chain;
	}

	private _generateHeaders(method: string, requestUrl: string, body?: object, queryParam?: string) {
		if (!this._account.api?.secretKey) throw new MissingFieldError('mainGateAccount.api.secretKey', false);

		const timestamp = Math.floor(Date.now() / 1000);

		const forSign =
			method +
			'\n' +
			requestUrl +
			'\n' +
			(queryParam ?? '') +
			'\n' +
			CryptoJS.SHA512(body ? JSON.stringify(body) : '').toString() +
			'\n' +
			timestamp;

		const sign = CryptoJS.HmacSHA512(forSign.toString(), this._account.api?.secretKey).toString();

		return {
			KEY: this._account.api?.apiKey,
			SIGN: sign,
			Timestamp: timestamp,
		};
	}
}
