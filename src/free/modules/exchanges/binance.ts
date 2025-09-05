import { Cex } from '@utils/account';
import { ChainId } from '@utils/network';
import axios from 'axios';
import { Logger } from '@utils/logger';
import { MissingFieldError } from '@utils/errors';
import CryptoJS from 'crypto-js';

interface BinanceAssetBalance {
	free: string;
	locked: string;
	asset: string;
	freeze: string;
	withdrawing: string;
	ipoable: string;
	btcValuation: string;
}

interface BinanceAssetConfig {
	free: string;
	locked: string;
	coin: string;
	freeze: string;
	ipoable: string;
	ipoing: string;
	isLegalMoney: boolean;
	depositAllEnable: boolean;
	name: string;
	networkList: {
		network: string;
		depositEnable: boolean;
		depositDesc: string;
		withdrawEnable: boolean;
		withdrawDesc: string;
		withdrawFee: string;
		withdrawMin: string;
		withdrawIntegerMultiple: string;
	}[];
}

export const BINANCE_API_URL = 'https://api4.binance.com';

export class Binance {
	private readonly _account: Cex;

	constructor(cexAccount: Cex) {
		this._account = cexAccount;
	}

	async withdraw(token: string, to: string, chainId: ChainId, amount: number) {
		if (!this._account?.api?.secretKey) throw new MissingFieldError('mainBinanceAccount.api.secretKey', false);
		const chain = this.getChain(chainId);
		if (!chain) throw new Error(`Couldnt find chain for ${chainId}!`);

		try {
			const configs = await this.getAssetsConfigs();

			const config = configs.find((a) => a.coin === token)?.networkList.find((n) => n.network === chain);
			if (!config) {
				throw new Error(`There is no binance config with tokenSymbol ${token} and chain ${chain}`);
			}

			const zeroCount = config.withdrawIntegerMultiple.split('.')[1];
			const withrawDecimals = zeroCount ? zeroCount.length : 0;

			if (!config.withdrawEnable) {
				throw new Error(`Withdrawal is not enabled.\n${config.withdrawDesc}`);
			}

			const balances = await this.getAccountBalances();

			const tokenBalance = balances.find((b) => b.asset === token);
			await Logger.getInstance().log(`${tokenBalance?.asset}: ${tokenBalance?.free}`);

			if (!tokenBalance) {
				throw new Error(`There is no balance of ${token}`);
			}

			const availableAmount = +tokenBalance.free;

			if (availableAmount < amount) {
				throw new Error(`There is no ${amount} ${token} on balance. Available: ${availableAmount}${token}`);
			}

			const wihdrawalAmount = +amount.toFixed(withrawDecimals);

			if (+config.withdrawMin > wihdrawalAmount) {
				throw new Error(
					`Minimal withdrawal amount ${config.withdrawMin} is more than wihdrawal amount ${wihdrawalAmount}`,
				);
			}

			const requestUri = this.generateRequestUri(
				`/sapi/v1/capital/withdraw/apply`,
				`coin=${token}&address=${to}&amount=${wihdrawalAmount}&network=${chain}`,
			);

			await axios.post(`${requestUri}`, null, {
				headers: this.generateHeaders(),
			});

			await Logger.getInstance().log(`Withdrawal succeed. ${wihdrawalAmount} ${token} to ${to}`);
		} catch (e: any) {
			const errorMsg = e.response?.data?.msg;
			throw new Error(`Withdrawal ${amount} ${token} to ${to} failed.\n${errorMsg ?? e}`);
		}
	}

	async getAssetsConfigs(): Promise<BinanceAssetConfig[]> {
		if (!this._account.api?.secretKey) {
			throw new Error('There is no secretKey');
		}
		const requestUri = this.generateRequestUri(`/sapi/v1/capital/config/getall`);

		const assetsConfigs: BinanceAssetConfig[] = (
			await axios.get(`${requestUri}`, {
				headers: this.generateHeaders(),
			})
		).data;

		return assetsConfigs;
	}

	async getAccountBalances(logging = false): Promise<BinanceAssetBalance[]> {
		if (!this._account.api?.secretKey) throw new MissingFieldError('mainBinanceAccount.api.secretKey', false);
		const requestUri = this.generateRequestUri(`/sapi/v3/asset/getUserAsset`, this._account.api.secretKey);

		const balances: BinanceAssetBalance[] = (
			await axios.post(`${requestUri}`, null, {
				headers: this.generateHeaders(),
			})
		).data;

		if (logging) {
			for (const balance of balances) {
				await Logger.getInstance().log(`${balance.asset}: ${balance.free}`);
			}
		}

		return balances;
	}

	generateHeaders() {
		return {
			'X-MBX-APIKEY': this._account.api?.apiKey,
		};
	}

	generateRequestUri(requestUrl: string, params?: string) {
		if (!this._account.api?.secretKey) throw new MissingFieldError('mainBinanceAccount.api.secretKey', false);
		const timestamp = `timestamp=${Date.now()}`;
		params = params ? (params += `&${timestamp}`) : timestamp;

		const signature = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(params, this._account.api.secretKey));
		return `${BINANCE_API_URL}${requestUrl}?${params}&signature=${signature}`;
	}

	getChain(chainId: ChainId | undefined) {
		let chain;
		switch (chainId) {
			case ChainId.Arbitrum:
				chain = 'ARBITRUM';
				break;
			case ChainId.Optimism:
				chain = 'OPTIMISM';
				break;
			case ChainId.Bsc:
				chain = 'BSC';
				break;
			case ChainId.Polygon:
				chain = 'MATIC';
				break;
			case ChainId.Ethereum:
				chain = 'ETH';
				break;
			case ChainId.AvalancheC:
				chain = 'AVAXC';
				break;
			case ChainId.Aptos:
				chain = 'APT';
				break;
			case ChainId.Sui:
				chain = 'SUI';
				break;
			case ChainId.Celo:
				chain = 'CELO';
				break;
			case ChainId.Base:
				chain = 'BASE';
				break;
			case ChainId.Berachain:
				chain = 'BERA';
				break;
			case ChainId.Flow:
				chain = 'FLOW';
				break;
			case ChainId.Ronin:
				chain = 'RON';
				break;
			case ChainId.Scroll:
				chain = 'SCROLL';
				break;
			case ChainId.Sei:
				chain = 'SEIEVM';
				break;
			case ChainId.Sonic:
				chain = 'SONIC';
				break;
			case ChainId.Sophon:
				chain = 'SOPH';
				break;
			case ChainId.Starknet:
				chain = 'STARKNET';
				break;
			case ChainId.ZksyncEra:
				chain = 'ZKSYNCERA';
				break;
			default:
				break;
		}

		return chain;
	}
}
