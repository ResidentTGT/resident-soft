import axios from 'axios';
import { BYBIT_API_URL } from './constants/bybit';
import { ExchangeAccount } from './models/Account.interface';
import { getConfig } from './utils';
import { AssetBalance } from './models/AssetBalance.interface';

export async function getBybitBalance(
	bybitAccount: ExchangeAccount,
	accountType: string,
	coins?: string[],
): Promise<AssetBalance[]> {
	const requestUri = BYBIT_API_URL + '/v5/asset/transfer/query-account-coins-balance';
	let queryParams = `accountType=${accountType}`;
	if (coins) {
		queryParams += `&coin=${coins.join(',')}`;
	}
	const config = getConfig(bybitAccount, queryParams);

	const balances = (await axios.get(`${requestUri}?${queryParams}`, config)).data.result.balance;

	return balances;
}
