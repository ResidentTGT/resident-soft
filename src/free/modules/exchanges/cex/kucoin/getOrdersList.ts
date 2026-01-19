import axios from 'axios';
import { ExchangeAccount } from '../bybit/models/Account.interface';
import { getConfig } from './utils';
import { KUCOIN_API_URL } from './constants/kucoin';
import { Order } from './models/Order.interface';

export async function getOrdersList(account: ExchangeAccount): Promise<Order[]> {
	const requestUri = '/api/v1/orders';

	const queryParams = `status=active`;

	const config = getConfig(account, 'GET', requestUri, queryParams);
	const ordersData = (await axios.get(`${KUCOIN_API_URL}${requestUri}?${queryParams}`, config)).data.data.items;

	return ordersData;
}
