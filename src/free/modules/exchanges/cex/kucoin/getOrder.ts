import axios from 'axios';
import { ExchangeAccount } from '../bybit/models/Account.interface';
import { getConfig } from './utils';
import { KUCOIN_API_URL } from './constants/kucoin';
import { Order } from './models/Order.interface';

export async function getOrder(account: ExchangeAccount, orderId: string): Promise<Order> {
	const requestUri = `/api/v1/orders/${orderId}`;

	const config = getConfig(account, 'GET', requestUri);
	const order = (await axios.get(`${KUCOIN_API_URL}${requestUri}`, config)).data.data;

	return order;
}
