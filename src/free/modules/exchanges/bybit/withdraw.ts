import axios from 'axios';
import { BYBIT_API_URL } from './constants/bybit';
import { Logger, MessageType } from '@utils/logger';
import { ExchangeAccount } from './models/Account.interface';
import { getConfig } from './utils';
import { getBybitBalance } from './getBalance';

export async function withdraw(accounts: ExchangeAccount[]) {
	const requestUri = BYBIT_API_URL + '/v5/asset/withdraw/create';

	const accountType = 'FUND';
	const coin = 'USDT';

	for (const account of accounts) {
		await Logger.getInstance().log(`Account ${account.profile} started.`, MessageType.Info);

		const amount = +(await getBybitBalance(account, accountType, [coin]))[0].walletBalance;

		const body = {
			accountType,
			coin,
			amount: (Math.floor(amount * 10) / 10 - 0.3).toString(),
			address: account.withdrawWallet,
			chain: 'MATIC',
			timestamp: Date.now().toString(),
		};

		const config = getConfig(account, undefined, body);

		const resp = await axios.post(`${requestUri}`, body, config);
		if (resp.data.retMsg === 'success') {
			await Logger.getInstance().log(`Account ${account.profile}: ${amount} ${coin} withrawed.`, MessageType.Notice);
		} else {
			await Logger.getInstance().log(`Something goes wrong.`, MessageType.Error);
		}
	}
}
