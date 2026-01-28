import { Exchange } from './exchange.enum';

export interface UnifiedOrderbook {
	exchange: Exchange;
	symbol: string;
	bestBid: {
		price: number;
		quantity: number;
	};
	bestAsk: {
		price: number;
		quantity: number;
	};
	timestamp: number; // normalized to milliseconds
}
