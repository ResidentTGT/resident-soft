import axios from 'axios';
import { BYBIT_API_URL } from './constants/bybit';
import { ExchangeAccount } from './models/Account.interface';
import { getConfig } from './utils';
import { OrdersData } from './models/OrderInfo.interface';

export async function getOpenOrders(account: ExchangeAccount, orderId?: string): Promise<OrdersData> {
	const requestUri = BYBIT_API_URL + '/v5/order/realtime';

	let queryParams = `category=spot`;
	if (orderId) {
		queryParams += `&orderId=${orderId}`;
	}

	const config = getConfig(account, queryParams);
	const ordersData = (await axios.get(`${requestUri}?${queryParams}`, config)).data;

	return ordersData;
}
