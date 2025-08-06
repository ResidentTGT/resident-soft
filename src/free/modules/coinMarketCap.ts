import axios from 'axios';
import { Logger } from '@utils/logger';

export interface TokenPrice {
	symbol: string;
	price: number;
}

export abstract class CoinMarketCap {
	// CMS API Documentation: https://coinmarketcap.com/api/documentation/v1/#operation/getV2CryptocurrencyQuotesLatest
	static async getTokensPrices(tokensSymbols: string[], apiKey: string): Promise<TokenPrice[]> {
		await Logger.getInstance().log(`Start getting tokens prices from CMC...`);
		const resp = await axios.get(
			`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${tokensSymbols.join(',')}`,
			{
				headers: {
					'X-CMC_PRO_API_KEY': apiKey,
				},
			},
		);
		if (resp.status !== 200)
			throw new Error(
				`Something went wrong during getting tokens prices from CMC. Status: ${resp.status}. Status text: ${resp.statusText}`,
			);

		const tokensPrices: TokenPrice[] = [];

		tokensSymbols.forEach((t) => {
			tokensPrices.push({
				symbol: t,
				price: resp.data.data[t.toUpperCase()][0] ? resp.data.data[t.toUpperCase()][0].quote['USD'].price : 0,
			});
		});
		await Logger.getInstance().log(
			`Tokens prices have been received.\n${tokensPrices.map((t) => `${t.symbol}: $${t.price}`).join('\n')}`,
		);

		return tokensPrices;
	}
}
