import axios from 'axios';
import { generateHeaders, generateRequestUri } from './utils';
import { BinanceAssetBalance } from './models/AssetBalance.interface';
import { CexApi } from '@utils/account';
import { Logger } from '@utils/logger';

export async function getAccountBalances(api: CexApi, logging = false): Promise<BinanceAssetBalance[]> {
	if (!api.secretKey) {
		throw new Error('There is no secretKey');
	}
	const requestUri = generateRequestUri(`/sapi/v3/asset/getUserAsset`, api.secretKey);

	const balances: BinanceAssetBalance[] = (
		await axios.post(`${requestUri}`, null, {
			headers: generateHeaders(api),
		})
	).data;

	if (logging) {
		for (const balance of balances) {
			await Logger.getInstance().log(`${balance.asset}: ${balance.free}`);
		}
	}

	return balances;
}
