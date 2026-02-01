import WebSocket from 'ws';
import { Exchange } from './exchange.enum';
import { UnifiedOrderbook } from './orderbook.interface';
import { PositionInfo, UnifiedOrderUpdate } from './execution.interface';

export interface ExchangeAdapter {
	readonly exchange: Exchange;
	readonly color: string;

	// Market data
	subscribeOrderbook(symbol: string, onMessage: (data: UnifiedOrderbook) => void, onError?: (error: Error) => void): WebSocket;

	// Trading
	placeMarketOrder(symbol: string, side: 'buy' | 'sell', quantity: string, price?: string): Promise<string>;
	closePosition(position: PositionInfo): Promise<string>;
	getPosition(symbol: string): Promise<PositionInfo | null>;

	// Account data
	getAvailableBalance(): Promise<number>;

	// Market info
	getStepSize(symbol: string): Promise<number>;

	// Private streams (account data)
	subscribeOrderUpdates(
		symbol: string,
		onMessage: (data: UnifiedOrderUpdate) => void,
		onError?: (error: Error) => void,
	): WebSocket;
}

export type SymbolsMap = Map<Exchange, string>;
export type SubscriptionsMap = Map<Exchange, WebSocket>;
