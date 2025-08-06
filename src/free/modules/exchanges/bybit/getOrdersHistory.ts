import axios from 'axios';
import { BYBIT_API_URL } from './constants/bybit';
import { ExchangeAccount } from './models/Account.interface';
import { getConfig } from './utils';
import { OrderInfo } from './models/OrderInfo.interface';

export async function getOrdersHistory(account: ExchangeAccount, orderId?: string): Promise<OrderInfo[]> {
	const requestUri = BYBIT_API_URL + '/v5/order/history';

	let queryParams = `category=spot`;
	if (orderId) {
		queryParams += `&orderId=${orderId}`;
	}

	const config = getConfig(account, queryParams);
	const orders = (await axios.get(`${requestUri}?${queryParams}`, config)).data.result.list;

	return orders;
}
