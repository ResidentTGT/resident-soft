import axios from 'axios';
import { ExchangeAccount } from '../bybit/models/Account.interface';
import { getConfig } from './utils';
import { KUCOIN_API_URL } from './constants/kucoin';
import { KucoinBid } from './models/Bid.interface';

export async function getBid(account: ExchangeAccount, symbol: string): Promise<KucoinBid> {
	const requestUri = '/api/v1/market/orderbook/level1';
	const queryParams = `symbol=${symbol}`;

	const config = getConfig(account, 'GET', requestUri, queryParams);

	const bid = (await axios.get(`${KUCOIN_API_URL}${requestUri}?${queryParams}`, config)).data.data;

	return bid;
}
