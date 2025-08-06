import axios from 'axios';
import { OkxAssetBalance } from './models/AssetBalance.interface';
import { Logger, MessageType } from '@utils/logger';
import { ChainId } from '@utils/network';
import { OkxCurrencyInfo } from './models/CurrencyInfo.interface';
import { OkxSubAccount } from './models/Subaccount.interface';
import CryptoJS from 'crypto-js';
import { Cex } from '@utils/account';
import { MissingFieldError } from '@src/utils/errors';

export const OKX_API_URL = 'https://www.okx.com';

export class Okx {
	private readonly _account: Cex;

	constructor(cexAccount: Cex) {
		this._account = cexAccount;
	}

	async getBalances(subaccount?: string): Promise<OkxAssetBalance[]> {
		const requestUrl = subaccount ? `/api/v5/asset/subaccount/balances?subAcct=${subaccount}` : `/api/v5/asset/balances`;

		const headers = this.generateHeaders('GET', requestUrl);
		const response = await axios.get(`${OKX_API_URL}${requestUrl}`, {
			headers,
		});
		const balances = response.data.data;

		return balances;
	}
	async getCanDeposit(tokenSymbol: string, chainId: ChainId): Promise<boolean> {
		const currencyInfo = await this.getCurrencyInfo(tokenSymbol);
		const chain = this._getChain(chainId);
		const currencyChainInfo = currencyInfo.find((f) => f.chain === `${tokenSymbol}-${chain}`);

		if (!currencyChainInfo) {
			throw new Error(`There is no data with chain ${tokenSymbol}-${chain} in currency info.`);
		}

		return currencyChainInfo.canDep;
	}
	async getCanWithdraw(tokenSymbol: string, chainId: ChainId): Promise<boolean> {
		const currencyInfo = await this.getCurrencyInfo(tokenSymbol);
		const chain = this._getChain(chainId);
		const currencyChainInfo = currencyInfo.find((f) => f.chain === `${tokenSymbol}-${chain}`);

		if (!currencyChainInfo) {
			throw new Error(`There is no data with chain ${tokenSymbol}-${chain} in currency info.`);
		}

		return currencyChainInfo.canWd;
	}

	async getCurrencyInfo(token: string): Promise<OkxCurrencyInfo[]> {
		const requestUrl = `/api/v5/asset/currencies?ccy=${token}`;
		const headers = this.generateHeaders('GET', requestUrl);
		const response = await axios.get(`${OKX_API_URL}${requestUrl}`, {
			headers,
		});
		const info = response.data.data;

		return info;
	}

	async getMinWithdrawalAmount(token: string, chainId: ChainId): Promise<number> {
		const currencyInfo = await this.getCurrencyInfo(token);
		const chain = this._getChain(chainId);

		const currencyChainInfo = currencyInfo.find((f) => f.chain === `${token}-${chain}`);

		if (!currencyChainInfo) throw new Error(`There is no data with chain ${token}-${chain} in currency info.`);

		const minWd = +currencyChainInfo.minWd;

		await Logger.getInstance().log(`Minimum withdrawal amount for ${token}-${chain}: ${minWd}`);

		return minWd;
	}

	async getMinWithdrawalFee(token: string, chainId: ChainId): Promise<number> {
		const currencyInfo = await this.getCurrencyInfo(token);
		const chain = this._getChain(chainId);

		const currencyChainInfo = currencyInfo.find((f) => f.chain === `${token}-${chain}`);

		if (!currencyChainInfo) throw new Error(`There is no data with chain ${token}-${chain} in currency info.`);

		const minFee = +currencyChainInfo.minFee;
		await Logger.getInstance().log(`Fee for ${token}-${chain}: ${minFee}`);

		return minFee;
	}

	async getSubaccounts(): Promise<OkxSubAccount[]> {
		const requestUrl = `/api/v5/users/subaccount/list`;

		const headers = this.generateHeaders('GET', requestUrl);

		const response = await axios.get(`${OKX_API_URL}${requestUrl}`, {
			headers,
		});
		const subAccounts = response.data.data;

		return subAccounts;
	}

	async withdraw(to: string, token: string, internal: boolean, amount?: number, chainId?: ChainId): Promise<void> {
		let minFee = 0;
		let minWithdrawableAmount = 0;

		if (!internal) {
			if (!chainId) throw new Error(`There is no network in params.`);

			const canWithdraw = await this.getCanWithdraw(token, chainId);
			if (!canWithdraw) throw new Error(`Withdrawal of ${token}-${this._getChain(chainId)} is suspended.`);

			minFee = await this.getMinWithdrawalFee(token, chainId);
			minWithdrawableAmount = await this.getMinWithdrawalAmount(token, chainId);
		}

		const balance = (await this.getBalances()).find((b) => b.ccy === token)?.availBal;
		const maxWithdrawableAmount = balance ? +balance - minFee : 0;
		const withdrawableAmount = amount ?? maxWithdrawableAmount;

		if (withdrawableAmount < minWithdrawableAmount || withdrawableAmount > maxWithdrawableAmount) {
			throw new Error(
				`Amount of ${token} (${balance}) is less than min withdrawal amount or more than max withdrawal amount.`,
			);
		}

		const requestUrl = `/api/v5/asset/withdrawal`;

		let multiplier = 0.6;
		let fee = 0;

		while (multiplier <= 1) {
			fee = minFee * multiplier;
			const body = {
				amt: withdrawableAmount,
				fee: internal ? 0 : fee,
				dest: internal ? '3' : '4',
				ccy: token,
				chain: !internal && chainId ? `${token}-${this._getChain(chainId)}` : undefined,
				toAddr: to,
			};

			const headers = this.generateHeaders('POST', requestUrl, body);

			const response = await axios.post(`https://www.okx.com${requestUrl}`, body, {
				headers,
			});
			const code = +response.data.code;

			if (code === 58211) {
				multiplier = +(multiplier + 0.1).toFixed(1);
			} else if (code === 0) {
				await Logger.getInstance().log(`Withdrawal succeed. ${body.amt} ${token} to ${to}`);
				break;
			} else {
				throw new Error(`Something went wrong.\n${JSON.stringify(response.data)}`);
			}
		}
	}

	generateHeaders(method: string, requestUrl: string, body?: object) {
		if (!this._account.api?.secretKey) throw new MissingFieldError('mainOkxAccount.api.secretKey', false);
		if (!this._account.api?.apiKey) throw new MissingFieldError('mainOkxAccount.api.apiKey', false);
		if (!this._account.api?.passPhrase) throw new MissingFieldError('mainOkxAccount.api.passPhrase', false);
		const timestamp = new Date().toISOString();

		const forSign = body ? timestamp + method + requestUrl + JSON.stringify(body) : timestamp + method + requestUrl;
		const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(forSign, this._account.api.secretKey));

		return {
			'OK-ACCESS-KEY': this._account.api.apiKey,
			'OK-ACCESS-SIGN': sign,
			'OK-ACCESS-TIMESTAMP': timestamp,
			'OK-ACCESS-PASSPHRASE': this._account.api.passPhrase,
		};
	}

	async transferFromSubaccounts() {
		const subAccounts = await this.getSubaccounts();

		for (const subAccount of subAccounts) {
			const balances = await this.getBalances(subAccount.subAcct);
			for (const balanceObj of balances) {
				const requestUrl = `/api/v5/asset/transfer`;
				const balance = balanceObj.availBal;
				const token = balanceObj.ccy;
				const body = {
					amt: balance,
					ccy: token,
					from: 6,
					to: 6,
					type: 2,
					subAcct: subAccount.subAcct,
				};
				const headers = this.generateHeaders('POST', requestUrl, body);

				await axios.post(`https://www.okx.com${requestUrl}`, body, {
					headers,
				});

				await Logger.getInstance().log(
					`${balance} ${token} successfully transfered from ${subAccount.subAcct} to main.`,
					MessageType.Info,
				);
			}

			const newBalances = await this.getBalances();

			await Logger.getInstance().log(`\nBalances on ${this._account.email}:`);
			for (const balance of newBalances) {
				await Logger.getInstance().log(`${balance.ccy}: ${balance.availBal}`);
			}
		}
	}

	private _getChain(chainId: ChainId) {
		let chain;
		switch (chainId) {
			case ChainId.Arbitrum:
				chain = 'Arbitrum One';
				break;
			case ChainId.Optimism:
				chain = 'Optimism';
				break;
			case ChainId.Ethereum:
				chain = 'ERC20';
				break;
			case ChainId.Polygon:
				chain = 'Polygon';
				break;
			case ChainId.Core:
				chain = 'CORE';
				break;
			case ChainId.Starknet:
				chain = 'Starknet';
				break;
			case ChainId.Celo:
				chain = 'CELO';
				break;
			case ChainId.Aptos:
				chain = 'Aptos';
				break;
			case ChainId.Bsc:
				chain = 'BSC';
				break;
			case ChainId.ZksyncEra:
				chain = 'zkSync Era';
				break;
			case ChainId.Linea:
				chain = 'Linea';
				break;
			case ChainId.AvalancheC:
				chain = 'Avalanche C-Chain';
				break;
			case ChainId.Base:
				chain = 'Base';
				break;
			case ChainId.Berachain:
				chain = 'Berachain';
				break;
			case ChainId.Sonic:
				chain = 'Sonic';
				break;
			case ChainId.Ronin:
				chain = 'Ronin';
				break;
			case ChainId.Flow:
				chain = 'FLOW';
				break;
		}

		return chain;
	}
}
