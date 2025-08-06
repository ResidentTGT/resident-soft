import axios from 'axios';
import { BYBIT_API_URL } from './constants/bybit';
import { ExchangeAccount } from './models/Account.interface';
import { getConfig } from './utils';
import { BybitBid } from './models/Bid.interface';

export async function getBid(bybitAccount: ExchangeAccount, symbol: string): Promise<BybitBid> {
	const requestUri = BYBIT_API_URL + '/spot/v3/public/quote/ticker/bookTicker';
	const queryParams = `symbol=${symbol}`;

	const config = getConfig(bybitAccount, queryParams);

	const bid = (await axios.get(`${requestUri}?${queryParams}`, config)).data.result;

	return bid;
}
