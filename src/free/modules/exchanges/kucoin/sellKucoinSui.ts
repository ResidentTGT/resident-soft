import axios from 'axios';
import { Logger, MessageType } from '@utils/logger';
import { delay } from '@utils/delay';
import { ExchangeAccount } from '../bybit/models/Account.interface';
import { KUCOIN_API_URL } from './constants/kucoin';
import { getKucoinBalance } from './getBalance';
import { getBid } from './getBid';
import { cancelAllOrders } from './cancelAllOrders';
import { getConfig } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { getOrder } from './getOrder';

const createOrderRequestUri = '/api/v1/orders';

export async function sellKucoinSui(
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

				await Logger.getInstance().log(`Account ${account.profile} (kucoin ${group}) started.`, MessageType.Info);

				const balance = await getKucoinBalance(account, 'trade', [coin]);
				const bid = await getBid(account, symbol);

				if (!balance.length || !+balance[0].balance) {
					await Logger.getInstance().log(`There is no ${coin} balance.`, MessageType.Error);
				}
				if (!bid || !bid.bestBid) {
					await Logger.getInstance().log(`There is no bids on ${symbol}.`, MessageType.Error);
				}

				if (balance.length && +balance[0].balance > 0 && bid && bid.bestBid) {
					const coinBalance = +balance[0].balance;

					// const openOrders = await getOrdersList(account);
					// if (openOrders.length) {
					await cancelAllOrders([account]);
					// }

					const price = (
						Math.floor((+bid.bestBid < minPrice ? minPrice : +bid.bestBid * coefficient) * 100) / 100
					).toString();

					const uuid = uuidv4();
					const body = {
						clientOid: uuid,
						symbol,
						side: 'sell',
						type: 'limit',
						size: (Math.floor(coinBalance * 1000) / 1000).toString(),
						price,
					};

					const config = getConfig(account, 'POST', createOrderRequestUri, undefined, body);
					const createPrderResp = await axios.post(`${KUCOIN_API_URL}${createOrderRequestUri}`, body, config);
					const orderId = createPrderResp.data.data.orderId;

					if (orderId) {
						const order = await getOrder(account, orderId);

						if (!order.isActive && !order.cancelExist) {
							filledAccounts.push(account);
						}
						let status = 'Open';
						if (!order.isActive && !order.cancelExist) {
							status = 'Filled';
						}
						await Logger.getInstance().log(
							`Order status: ${status}, qty: ${order.size}, price: ${order.price}`,
							MessageType.Notice,
						);
					} else {
						await Logger.getInstance().log(`Couldnt create new order`, MessageType.Error);
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
