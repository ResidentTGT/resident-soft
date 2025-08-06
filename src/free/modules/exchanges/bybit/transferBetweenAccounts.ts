import { Logger, MessageType } from '@utils/logger';
import { ExchangeAccount } from './models/Account.interface';
import { transfer } from './transferCoin';

export async function transferBetweenAccounts(accounts: ExchangeAccount[], from: string, to: string, coin: string) {
	for (const account of accounts) {
		await Logger.getInstance().log(`Account ${account.profile} started.`, MessageType.Info);

		await transfer(account, coin, from, to);

		await Logger.getInstance().log(`Account ${account.profile} finished.`, MessageType.Info);
	}
}
