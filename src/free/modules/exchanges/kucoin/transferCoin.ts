import axios from 'axios';
import { Logger, MessageType } from '@utils/logger';
import { ExchangeAccount } from '../bybit/models/Account.interface';

import { v4 as uuidv4 } from 'uuid';
import { getKucoinBalance } from './getBalance';
import { KUCOIN_API_URL } from './constants/kucoin';
import { getConfig } from './utils';

export async function transfer(account: ExchangeAccount, coin: string, from: 'main' | 'trade', to: 'main' | 'trade') {
	const requestUri = '/api/v2/accounts/inner-transfer';

	const balance = await getKucoinBalance(account, from, [coin]);

	if (balance.length && +balance[0].available > 0) {
		const coinBalance = +balance[0].available;

		const uuid = uuidv4();
		const body = {
			currency: coin,
			from,
			to,
			amount: coinBalance.toString(),
			clientOid: uuid,
		};
		const config = getConfig(account, 'POST', requestUri, undefined, body);

		await axios.post(`${KUCOIN_API_URL}${requestUri}`, body, config);

		await Logger.getInstance().log(`${coinBalance} ${coin} transferred from ${from} to ${to} .`, MessageType.Notice);
	}
}
