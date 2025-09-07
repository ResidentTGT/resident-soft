import { Logger, MessageType } from '@utils/logger';
import { ChainId } from '@utils/network';
import axios from 'axios';
import { Cex } from '@utils/account';
import { MissingFieldError } from '@src/utils/errors';
import crypto from 'crypto';
import { AssetBalance } from './models/AssetBalance.interface';
import { BybitBid } from './models/Bid.interface';
import { OrderInfo, OrdersData } from './models/OrderInfo.interface';
import { delay } from '@utils/delay';
import { v4 as uuidv4 } from 'uuid';

export const BYBIT_API_URL = 'https://api.bybit.com';

export class Bybit {
	private readonly _account: Cex;

	constructor(cexAccount: Cex) {
		this._account = cexAccount;
	}

	async cancelAllOrders(): Promise<void> {
		const requestUri = BYBIT_API_URL + '/v5/order/cancel-all';

		const body = { category: 'spot' };

		const config = this.getConfig(undefined, body);
		await axios.post(`${requestUri}`, body, config);
		await Logger.getInstance().log(`All orders cancelled.`);
	}

	async getBybitBalance(accountType: string, coins?: string[]): Promise<AssetBalance[]> {
		const requestUri = BYBIT_API_URL + '/v5/asset/transfer/query-account-coins-balance';
		let queryParams = `accountType=${accountType}`;
		if (coins) {
			queryParams += `&coin=${coins.join(',')}`;
		}
		const config = this.getConfig(queryParams);

		const balances = (await axios.get(`${requestUri}?${queryParams}`, config)).data.result.balance;

		return balances;
	}

	async getBid(symbol: string): Promise<BybitBid> {
		const requestUri = BYBIT_API_URL + '/spot/v3/public/quote/ticker/bookTicker';
		const queryParams = `symbol=${symbol}`;

		const config = this.getConfig(queryParams);

		const bid = (await axios.get(`${requestUri}?${queryParams}`, config)).data.result;

		return bid;
	}

	async getOpenOrders(orderId?: string): Promise<OrdersData> {
		const requestUri = BYBIT_API_URL + '/v5/order/realtime';

		let queryParams = `category=spot`;
		if (orderId) {
			queryParams += `&orderId=${orderId}`;
		}

		const config = this.getConfig(queryParams);
		const ordersData = (await axios.get(`${requestUri}?${queryParams}`, config)).data;

		return ordersData;
	}

	async getOrdersHistory(orderId?: string): Promise<OrderInfo[]> {
		const requestUri = BYBIT_API_URL + '/v5/order/history';

		let queryParams = `category=spot`;
		if (orderId) {
			queryParams += `&orderId=${orderId}`;
		}

		const config = this.getConfig(queryParams);
		const orders = (await axios.get(`${requestUri}?${queryParams}`, config)).data.result.list;

		return orders;
	}

	async sellBybitSui(coin: string, symbol: string, minPrice: number, coefficient: number) {
		const createOrderRequestUri = BYBIT_API_URL + '/v5/order/create';

		try {
			const balance = await this.getBybitBalance('SPOT', [coin]);
			const bid = await this.getBid(symbol);

			if (!balance.length || !+balance[0].walletBalance) {
				await Logger.getInstance().log(`There is no ${coin} balance.`, MessageType.Error);
			}
			if (!bid.bidPrice) {
				await Logger.getInstance().log(`There is no bids on ${symbol}.`, MessageType.Error);
			}

			if (balance.length && +balance[0].walletBalance > 0 && bid.bidPrice) {
				const coinBalance = +balance[0].walletBalance;

				// const openOrders = (await getOpenOrders(account)).result.list;
				// if (openOrders.length) {
				await this.cancelAllOrders();
				// }

				const price = (
					Math.floor((+bid.bidPrice < minPrice ? minPrice : +bid.bidPrice * coefficient) * 100) / 100
				).toString();

				const body = {
					category: 'spot',
					symbol: symbol,
					side: 'Sell',
					orderType: 'Limit',
					qty: (Math.floor(coinBalance * 1000) / 1000).toString(),
					price,
				};

				const config = this.getConfig(undefined, body);
				const createPrderResp = await axios.post(`${createOrderRequestUri}`, body, config);
				const orderId = createPrderResp.data.result.orderId;

				if (orderId) {
					const ordersData = await this.getOpenOrders(orderId);
					const newOrder = ordersData.result.list[0];

					await Logger.getInstance().log(
						`Order status: ${newOrder.orderStatus}, qty: ${newOrder.qty}, price: ${newOrder.price}, avgprice: ${newOrder.avgPrice}`,
						MessageType.Notice,
					);
				} else {
					await Logger.getInstance().log(
						`Couldnt create new order. Reason: ${createPrderResp.data.retMsg}`,
						MessageType.Error,
					);
				}
			} else {
				await delay(0.5);
			}
		} catch (e) {
			await Logger.getInstance().log(JSON.stringify(e), MessageType.Error);
		}
	}

	async transfer(coin: string, from: string, to: string) {
		const requestUri = BYBIT_API_URL + '/v5/asset/transfer/inter-transfer';

		const balance = await this.getBybitBalance(from, [coin]);

		if (balance.length && +balance[0].transferBalance > 0) {
			const coinBalance = +balance[0].transferBalance;

			const uuid = uuidv4();
			const body = {
				coin,
				fromAccountType: from,
				toAccountType: 'FUND',
				amount: coinBalance.toString(),
				transferId: uuid,
			};
			const config = this.getConfig(undefined, body);

			await axios.post(`${requestUri}`, body, config);

			await Logger.getInstance().log(`${coinBalance} ${coin} transferred from ${from} to ${to} .`, MessageType.Notice);
		}
	}

	getConfig(queryParams?: string, body?: any) {
		if (!this._account.api?.apiKey) throw new MissingFieldError('mainBybitAccount.api.apiKey', false);
		if (!this._account.api?.secretKey) throw new MissingFieldError('mainBybitAccount.api.secretKey', false);

		const timestamp = body?.timestamp ?? Date.now().toString();
		const recvWindow = '5000';

		const parameters = queryParams ?? JSON.stringify(body);

		const forSign = timestamp + this._account.api.apiKey + recvWindow + parameters;
		const sign = crypto.createHmac('sha256', this._account.api.secretKey).update(forSign).digest('hex');

		const config = {
			headers: {
				'X-BAPI-SIGN-TYPE': '2',
				'X-BAPI-API-KEY': this._account.api.apiKey,
				'X-BAPI-SIGN': sign,
				'X-BAPI-TIMESTAMP': timestamp,
				'X-BAPI-RECV-WINDOW': recvWindow,
				'Content-Type': 'application/json; charset=utf-8',
			},
		};

		return config;
	}

	async withdraw(to: string, token: string, amount: number, chainId: ChainId) {
		const requestUri = BYBIT_API_URL + '/v5/asset/withdraw/create';

		const chain = this._getChain(chainId);

		const body = {
			accountType: 'FUND',
			coin: token,
			amount: amount.toFixed(6),
			address: to,
			chain,
			timestamp: Date.now().toString(),
		};

		const config = this.getConfig(undefined, body);

		const resp = await axios.post(`${requestUri}`, JSON.stringify(body), config);

		if (resp.data.retMsg === 'success') {
			await Logger.getInstance().log(`Withdrawal succeed. ${amount} ${token} to ${to}`);
		} else {
			const errorMsg = resp.data?.retMsg;
			throw new Error(`Withdrawal ${amount} ${token} to ${to} failed.\n${errorMsg ?? resp.data}`);
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
				chain = 'ARBI';
				break;
			case ChainId.Optimism:
				chain = 'OP';
				break;
			case ChainId.Bsc:
				chain = 'BSC';
				break;
			case ChainId.Base:
				chain = 'BASE';
				break;
			case ChainId.Polygon:
				chain = 'MATIC';
				break;
			case ChainId.Solana:
				chain = 'SOL';
				break;
			case ChainId.Aptos:
				chain = 'APTOS';
				break;
			case ChainId.ArbitrumNova:
				chain = 'ARBINOVA';
				break;
			case ChainId.AvalancheC:
				chain = 'CAVAX';
				break;
			case ChainId.Blast:
				chain = 'BLAST';
				break;
			case ChainId.Celo:
				chain = 'CELO';
				break;
			case ChainId.Core:
				chain = 'CORE';
				break;
			case ChainId.Eclipse:
				chain = 'ECLIPSE';
				break;
			case ChainId.Sonic:
				chain = 'SONIC';
				break;
			case ChainId.Flow:
				chain = 'FLOW';
				break;
			case ChainId.HyperEVM:
				chain = 'HYPEREVM';
				break;
			case ChainId.Linea:
				chain = 'LINEA';
				break;
			case ChainId.Scroll:
				chain = 'SCROLL';
				break;
			case ChainId.Starknet:
				chain = 'STARKNET';
				break;
			case ChainId.Sui:
				chain = 'SUI';
				break;
			case ChainId.ZksyncEra:
				chain = 'ZKSYNC';
				break;
			case ChainId.Sei:
				chain = 'SEIEVM';
				break;
		}

		return chain;
	}
}
