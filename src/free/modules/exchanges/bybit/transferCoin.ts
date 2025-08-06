import axios from 'axios';
import { BYBIT_API_URL } from './constants/bybit';
import { Logger, MessageType } from '@utils/logger';
import { ExchangeAccount } from './models/Account.interface';
import { getBybitBalance } from './getBalance';
import { getConfig } from './utils';
import { v4 as uuidv4 } from 'uuid';

export async function transfer(account: ExchangeAccount, coin: string, from: string, to: string) {
	const requestUri = BYBIT_API_URL + '/v5/asset/transfer/inter-transfer';

	const balance = await getBybitBalance(account, from, [coin]);

	if (balance.length && +balance[0].transferBalance > 0) {
		const coinBalance = +balance[0].transferBalance;

		const uuid = uuidv4();
		const body = {
			coin,
			fromAccountType: from,
			toAccountType: to,
			amount: coinBalance.toString(),
			transferId: uuid,
		};
		const config = getConfig(account, undefined, body);

		await axios.post(`${requestUri}`, body, config);

		await Logger.getInstance().log(`${coinBalance} ${coin} transferred from ${from} to ${to} .`, MessageType.Notice);
	}
}
