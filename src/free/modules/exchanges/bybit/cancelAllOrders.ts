import axios from 'axios';
import { BYBIT_API_URL } from './constants/bybit';
import { ExchangeAccount } from './models/Account.interface';
import { Logger, MessageType } from '@utils/logger';
import { getConfig } from './utils';

export async function cancelAllOrders(accounts: ExchangeAccount[]): Promise<void> {
	const requestUri = BYBIT_API_URL + '/v5/order/cancel-all';

	const body = { category: 'spot' };
	for (const account of accounts) {
		const config = getConfig(account, undefined, body);
		await axios.post(`${requestUri}`, body, config);
		await Logger.getInstance().log(`Account ${account.profile}: all orders cancelled.`, MessageType.Notice);
	}
}
