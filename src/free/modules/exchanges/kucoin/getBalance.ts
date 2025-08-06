import axios from 'axios';
import { ExchangeAccount } from '../bybit/models/Account.interface';
import { getConfig } from './utils';
import { KUCOIN_API_URL } from './constants/kucoin';
import { AssetBalance } from './models/AssetBalance.interface';

export async function getKucoinBalance(
	account: ExchangeAccount,
	accountType: 'main' | 'trade',
	coins?: string[],
): Promise<AssetBalance[]> {
	const requestUri = '/api/v1/accounts';
	let queryParams = `type=${accountType}`;
	if (coins) {
		queryParams += `&currency=${coins.join(',')}`;
	}

	const config = getConfig(account, 'GET', requestUri, queryParams);

	const balances = (await axios.get(`${KUCOIN_API_URL}${requestUri}?${queryParams}`, config)).data.data;

	return balances;
}
