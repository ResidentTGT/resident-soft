import axios from 'axios';
import { BYBIT_API_URL } from './constants/bybit';
import { Logger, MessageType } from '@utils/logger';
import { delay } from '@utils/delay';
import { ExchangeAccount } from './models/Account.interface';
import { getBybitBalance } from './getBalance';
import { getConfig } from './utils';
import { getOpenOrders } from './getOpenOrders';
import { getBid } from './getBid';
import { cancelAllOrders } from './cancelAllOrders';

const createOrderRequestUri = BYBIT_API_URL + '/v5/order/create';

export async function sellBybitSui(
	group: number,
	accounts: ExchangeAccount[],
	coin: string,
	symbol: string,
	minPrice: number,
	coefficient: number,
) {
	const filledAccounts: ExchangeAccount[] = [];

	while (filledAccounts.length < accounts.length) {
		for (const account of accounts) {
			try {
				if (filledAccounts.map((a) => a.profile).includes(account.profile)) {
					continue;
				}

				await Logger.getInstance().log(`Account ${account.profile} (bybit ${group}) started.`, MessageType.Info);

				// await transfer(account, coin, 'FUND', 'SPOT');

				const balance = await getBybitBalance(account, 'SPOT', [coin]);
				const bid = await getBid(account, symbol);

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
					await cancelAllOrders([account]);
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

					const config = getConfig(account, undefined, body);
					const createPrderResp = await axios.post(`${createOrderRequestUri}`, body, config);
					const orderId = createPrderResp.data.result.orderId;

					if (orderId) {
						const ordersData = await getOpenOrders(account, orderId);
						const newOrder = ordersData.result.list[0];

						if (newOrder.orderStatus === 'Filled') {
							filledAccounts.push(account);
						}

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
	}

	await Logger.getInstance().log(`Accounts ${accounts.map((a) => a.profile).join(',')} (${group}) finished.`, MessageType.Info);
}
