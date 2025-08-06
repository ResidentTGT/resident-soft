import { getAccountBalances } from './getBalance';
import { generateHeaders, generateRequestUri, getChain } from './utils';
import { getAssetsConfigs } from './getAssetsConfigs';
import axios from 'axios';
import { ChainId } from '@utils/network';
import { CexApi } from '@utils/account';
import { Logger } from '@utils/logger';
import { MissingFieldError } from '@src/utils/errors';

export async function binanceWithdraw(
	tokenSymbol: string,
	to: string,
	chainId: ChainId,
	binanceAccountApi: CexApi,
	amount?: number,
) {
	if (!binanceAccountApi.secretKey) throw new MissingFieldError('mainBinanceAccount.api.secretKey', false);
	const chain = getChain(chainId);

	const configs = await getAssetsConfigs(binanceAccountApi);

	const config = configs.find((a) => a.coin === tokenSymbol)?.networkList.find((n) => n.network === chain);
	if (!config) {
		throw new Error(`There is no binance config with tokenSymbol ${tokenSymbol} and chain ${chain}`);
	}

	const zeroCount = config.withdrawIntegerMultiple.split('.')[1];
	const withrawDecimals = zeroCount ? zeroCount.length : 0;

	if (!config.withdrawEnable) {
		throw new Error(`Withdrawal is not enabled.\n${config.withdrawDesc}`);
	}

	const balances = await getAccountBalances(binanceAccountApi);

	const tokenBalance = balances.find((b) => b.asset === tokenSymbol);
	await Logger.getInstance().log(`${tokenBalance?.asset}: ${tokenBalance?.free}`);

	if (!tokenBalance) {
		throw new Error(`There is no balance of ${tokenSymbol}`);
	}

	const availableAmount = +tokenBalance.free;

	if (amount && availableAmount < amount) {
		throw new Error(`There is no ${amount}${tokenSymbol} on balance. Available: ${availableAmount}${tokenSymbol}`);
	}

	const wihdrawalAmount =
		Math.floor((amount ?? availableAmount) * Math.pow(10, withrawDecimals)) / Math.pow(10, withrawDecimals);

	if (+config.withdrawMin > wihdrawalAmount) {
		throw new Error(`Minimal withdrawal amount ${config.withdrawMin} is more than wihdrawal amount ${wihdrawalAmount}`);
	}

	const requestUri = generateRequestUri(
		`/sapi/v1/capital/withdraw/apply`,
		binanceAccountApi.secretKey,
		`coin=${tokenSymbol}&address=${to}&amount=${wihdrawalAmount}&network=${chain}`,
	);

	await axios.post(`${requestUri}`, null, {
		headers: generateHeaders(binanceAccountApi),
	});

	await Logger.getInstance().log(`Withdrawal succeed. ${wihdrawalAmount} ${tokenSymbol} to ${to}`);
}
