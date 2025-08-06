import axios from 'axios';
import { ExchangeAccount } from '../bybit/models/Account.interface';
import { getConfig } from './utils';
import { Logger, MessageType } from '@utils/logger';
import { KUCOIN_API_URL } from './constants/kucoin';

export async function cancelAllOrders(accounts: ExchangeAccount[]): Promise<void> {
	const requestUri = '/api/v1/orders';

	for (const account of accounts) {
		const config = getConfig(account, 'DELETE', requestUri);
		await axios.delete(`${KUCOIN_API_URL}${requestUri}`, config);
		await Logger.getInstance().log(`Account ${account.profile}: all orders cancelled.`, MessageType.Notice);
	}
}
