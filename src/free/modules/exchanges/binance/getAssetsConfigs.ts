import axios from 'axios';
import { generateHeaders, generateRequestUri } from './utils';
import { BinanceAssetConfig } from './models/AssetConfig.interface';
import { CexApi } from '@utils/account';

export async function getAssetsConfigs(api: CexApi): Promise<BinanceAssetConfig[]> {
	if (!api.secretKey) {
		throw new Error('There is no secretKey');
	}
	const requestUri = generateRequestUri(`/sapi/v1/capital/config/getall`, api.secretKey);

	const assetsConfigs: BinanceAssetConfig[] = (
		await axios.get(`${requestUri}`, {
			headers: generateHeaders(api),
		})
	).data;

	return assetsConfigs;
}
