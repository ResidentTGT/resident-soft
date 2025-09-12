import axios from 'axios';
import { Logger } from '@utils/logger';
import { ChainId } from '@utils/network';
import { delay } from '@utils/delay';
import CryptoJS from 'crypto-js';
import { BitgetSubAccount } from './models/Subaccount.interface';
import { AccountInformation } from './models/AccountInformation.interface';
import { Asset, SubaccountAssets } from './models/Asset.inteface';
import { Cex } from '@utils/account';
import { MissingFieldError } from '@src/utils/errors';

export const BITGET_API_URL = 'https://api.bitget.com';

export class Bitget {
	private readonly _account: Cex;

	constructor(cexAccount: Cex) {
		this._account = cexAccount;
	}

	async getAccountInformation(): Promise<AccountInformation> {
		const requestUrl = `/api/v2/spot/account/info`;

		const headers = this.generateHeaders('GET', requestUrl);

		const response = await axios.get(`${BITGET_API_URL}${requestUrl}`, {
			headers,
		});
		const account = response.data.data;

		return account;
	}

	async getSubaccounts(): Promise<BitgetSubAccount[]> {
		const requestUrl = `/api/v2/user/virtual-subaccount-list`;

		const headers = this.generateHeaders('GET', requestUrl);

		const response = await axios.get(`${BITGET_API_URL}${requestUrl}`, {
			headers,
		});
		const subAccounts = response.data.data.subAccountList;

		return subAccounts;
	}

	async getAssets(): Promise<Asset[]> {
		const requestUrl = `/api/v2/spot/account/assets`;

		const headers = this.generateHeaders('GET', requestUrl);

		const response = await axios.get(`${BITGET_API_URL}${requestUrl}`, {
			headers,
		});
		const assets = response.data.data;

		return assets;
	}

	async getSubaccountsAssets(): Promise<SubaccountAssets[]> {
		const requestUrl = `/api/v2/spot/account/subaccount-assets`;

		const headers = this.generateHeaders('GET', requestUrl);

		const response = await axios.get(`${BITGET_API_URL}${requestUrl}`, {
			headers,
		});
		const assets = response.data.data;

		return assets;
	}

	async transferAllAssetsFromSubaccountToMain(subaccountId: string): Promise<void> {
		const requestUrl = `/api/v2/spot/wallet/subaccount-transfer`;
		const account = await this.getAccountInformation();

		const assets = (await this.getSubaccountsAssets())
			.filter((a) => a.userId.toString() === subaccountId)
			.map((q) => q.assetsList[0]);

		for (const asset of assets) {
			const amount = asset.available;
			const coin = asset.coin;
			const body = {
				fromType: 'spot',
				toType: 'spot',
				amount,
				coin,
				fromUserId: subaccountId,
				toUserId: account.userId,
			};

			const headers = this.generateHeaders('POST', requestUrl, body);

			const resp = await axios.post(`${BITGET_API_URL}${requestUrl}`, body, {
				headers,
			});

			if (resp.data.msg === 'success')
				await Logger.getInstance().log(`${amount} ${coin} transfered from ${subaccountId} to main.`);
			else {
				throw new Error(`Couldnt transfer ${amount} ${coin} from ${subaccountId} to main.`);
			}
			await delay(1);
		}
	}

	async transferAllAssetsFromAllSubaccountsToMain(): Promise<void> {
		const subaccs = await this.getSubaccounts();
		for (const subacc of subaccs) {
			await this.transferAllAssetsFromSubaccountToMain(subacc.subAccountUid);
			await delay(1);
		}
	}

	generateHeaders(method: string, requestUrl: string, body?: object) {
		if (!this._account.api?.secretKey) throw new MissingFieldError('mainBitgetAccount.api.secretKey', false);
		if (!this._account.api?.apiKey) throw new MissingFieldError('mainBitgetAccount.api.apiKey', false);
		if (!this._account.api?.passPhrase) throw new MissingFieldError('mainBitgetAccount.api.passPhrase', false);
		const timestamp = Date.now().toString();

		const forSign = body ? timestamp + method + requestUrl + JSON.stringify(body) : timestamp + method + requestUrl;
		const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(forSign, this._account.api.secretKey));

		return {
			'ACCESS-KEY': this._account.api.apiKey,
			'ACCESS-SIGN': sign,
			'ACCESS-TIMESTAMP': timestamp,
			'ACCESS-PASSPHRASE': this._account.api.passPhrase,
			'Content-Type': 'application/json',
			locale: 'en-US',
		};
	}

	//для вывода нужно и айпишник, и вайтлисты адресов
	async withdraw(to: string, token: string, internal: boolean, amount: number, chainId?: ChainId): Promise<void> {
		const requestUrl = `/api/v2/spot/wallet/withdrawal`;

		const body = {
			coin: token,
			transferType: internal ? 'internal_transfer' : 'on_chain',
			address: to,
			chain: chainId ? this._getChain(chainId) : undefined,
			size: amount,
		};

		const headers = this.generateHeaders('POST', requestUrl, body);

		try {
			const response = (
				await axios.post(`${BITGET_API_URL}${requestUrl}`, body, {
					headers,
				})
			).data;

			await Logger.getInstance().log(`Withdrawal succeed. ${body.size} ${token} to ${to}`);
			return response;
		} catch (e: any) {
			const errorMsg = e.response?.data?.msg;
			throw new Error(`Withdrawal ${body.size} ${token} to ${to} failed.\n${errorMsg ?? e}`);
		}
	}

	private _getChain(chainId: ChainId) {
		let chain;
		switch (chainId) {
			case ChainId.Berachain:
				chain = 'BERA';
				break;
			case ChainId.Ethereum:
				chain = 'ETH';
				break;
			case ChainId.Arbitrum:
				chain = 'ArbitrumOne';
				break;
			case ChainId.Optimism:
				chain = 'Optimism';
				break;
			case ChainId.Bsc:
				chain = 'BEP20';
				break;
			case ChainId.Base:
				chain = 'BASE';
				break;
			case ChainId.Polygon:
				chain = 'Polygon';
				break;
			case ChainId.Solana:
				chain = 'SOL';
				break;
			case ChainId.Aptos:
				chain = 'Aptos';
				break;
			case ChainId.ArbitrumNova:
				chain = 'ArbitrumNova';
				break;
			case ChainId.AvalancheC:
				chain = 'AVAXC-Chain';
				break;
			case ChainId.Blast:
				chain = 'Blast';
				break;
			case ChainId.Celo:
				chain = 'CELO';
				break;
			case ChainId.Core:
				chain = 'CoreDAO';
				break;
			case ChainId.Eclipse:
				chain = 'Eclipse';
				break;
			case ChainId.Sonic:
				chain = 'SONIC';
				break;
			case ChainId.Flow:
				chain = 'Flow';
				break;
			case ChainId.HyperEVM:
				chain = 'HYPE';
				break;
			case ChainId.Linea:
				chain = 'LINEA';
				break;
			case ChainId.Ronin:
				chain = 'RONIN';
				break;
			case ChainId.Scroll:
				chain = 'SCROLL';
				break;
			case ChainId.Sophon:
				chain = 'Sophon';
				break;
			case ChainId.Starknet:
				chain = 'Starknet';
				break;
			case ChainId.Sui:
				chain = 'SUI';
				break;
			case ChainId.ZksyncEra:
				chain = 'zkSyncEra';
				break;
			case ChainId.Sei:
				chain = 'SEIEVM';
				break;
		}

		return chain;
	}
}
