import CryptoJS from 'crypto-js';

import { BINANCE_API_URL } from './constants/binance';
import { ChainId } from '@utils/network';
import { CexApi } from '@utils/account';

export function generateHeaders(api: CexApi) {
	return {
		'X-MBX-APIKEY': api.apiKey,
	};
}

export function generateRequestUri(requestUrl: string, secretKey: string, params?: string) {
	const timestamp = `timestamp=${Date.now()}`;
	params = params ? (params += `&${timestamp}`) : timestamp;

	const signature = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(params, secretKey));
	return `${BINANCE_API_URL}${requestUrl}?${params}&signature=${signature}`;
}

export function getChain(chainId: ChainId | undefined) {
	let chain;
	switch (chainId) {
		case ChainId.Arbitrum:
			chain = 'ARBITRUM';
			break;
		case ChainId.Optimism:
			chain = 'OPTIMISM';
			break;
		case ChainId.Bsc:
			chain = 'BSC';
			break;
		case ChainId.Polygon:
			chain = 'MATIC';
			break;
		case ChainId.Ethereum:
			chain = 'ETH';
			break;
		case ChainId.AvalancheC:
			chain = 'AVAXC';
			break;
		case ChainId.Aptos:
			chain = 'APT';
			break;
		case ChainId.Sui:
			chain = 'SUI';
			break;
		case ChainId.Celo:
			chain = 'CELO';
			break;
		case ChainId.Base:
			chain = 'BASE';
			break;
		default:
			break;
	}

	return chain;
}
