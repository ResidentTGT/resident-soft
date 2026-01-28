import WebSocket from 'ws';
import { Backpack } from '../../backpack/backpack';
import { BookTickerMessage } from '../../backpack/models/orderbook.interface';
import { BackpackOrderUpdateWs } from '../../backpack/models/order.interface';
import { Exchange, UnifiedOrderbook, ExchangeAdapter, PositionInfo, UnifiedOrderUpdate } from '../models';
import { Logger, MessageType } from '@utils/logger';

export class BackpackAdapter implements ExchangeAdapter {
	readonly exchange = Exchange.Backpack;
	readonly color = 'rgb(255, 38, 0)';
	private _logger = Logger.getInstance();

	constructor(private _client: Backpack) {}

	subscribeOrderbook(symbol: string, onMessage: (data: UnifiedOrderbook) => void, onError?: (error: Error) => void): WebSocket {
		this._logger.log(`[Backpack] Subscribing to orderbook: ${symbol}`, MessageType.Debug);

		return this._client.subscribeOrderbook(
			symbol,
			(data: BookTickerMessage) => {
				const orderbook: UnifiedOrderbook = {
					exchange: Exchange.Backpack,
					symbol: data.data.s,
					bestBid: {
						price: parseFloat(data.data.b),
						quantity: parseFloat(data.data.B),
					},
					bestAsk: {
						price: parseFloat(data.data.a),
						quantity: parseFloat(data.data.A),
					},
					timestamp: Math.round(data.data.T / 1000), // microseconds to milliseconds
				};
				onMessage(orderbook);
			},
			(err) => {
				this._logger.log(`[Backpack] WebSocket error: ${err.message}`, MessageType.Error);
				onError?.(err);
			},
		);
	}

	async placeMarketOrder(symbol: string, side: 'buy' | 'sell', quantity: string): Promise<string> {
		const backpackSide = side === 'buy' ? 'Bid' : 'Ask';

		const response = await this._client.placeMarketOrder(symbol, backpackSide, quantity);

		return response.id;
	}

	async closePosition(position: PositionInfo): Promise<string> {
		const response = await this._client.closePosition(position);

		// Calculate average price: executedQuoteQuantity is total USDC, divide by quantity to get price per unit
		// const executedQty = parseFloat(response.executedQuantity);
		// const executedQuoteQty = parseFloat(response.executedQuoteQuantity);
		// const avgPrice = executedQty > 0 ? (executedQuoteQty / executedQty).toString() : '0';

		return response.id;
	}

	async getPosition(symbol: string): Promise<PositionInfo | null> {
		const positions = await this._client.getPosition(symbol);

		const position = positions.find((p) => p.symbol === symbol);

		if (!position || parseFloat(position.netQuantity) === 0) return null;

		const netQty = parseFloat(position.netQuantity);
		const positionInfo: PositionInfo = {
			symbol,
			side: netQty > 0 ? 'long' : 'short',
			quantity: Math.abs(netQty).toString(),
		};

		await this._logger.log(
			`[Backpack] Position found: ${positionInfo.side} ${positionInfo.quantity} ${symbol}`,
			MessageType.Debug,
		);

		return positionInfo;
	}

	subscribeOrderUpdates(
		symbol: string,
		onMessage: (data: UnifiedOrderUpdate) => void,
		onError?: (error: Error) => void,
	): WebSocket {
		this._logger.log(`[Backpack] Subscribing to order updates: ${symbol}`, MessageType.Debug);

		return this._client.subscribeOrderUpdates(
			symbol,
			(data: BackpackOrderUpdateWs) => {
				const update: UnifiedOrderUpdate = {
					exchange: Exchange.Backpack,
					orderId: data.data.i,
					symbol: data.data.s,
					side: data.data.S === 'Bid' ? 'buy' : 'sell',
					status: this._mapBackpackStatus(data.data.X),
					quantity: data.data.q,
					filledQuantity: data.data.z,
					avgPrice: data.data.L,
					timestamp: Math.round(data.data.E / 1000), // microseconds to milliseconds
				};
				onMessage(update);
			},
			(err) => {
				this._logger.log(`[Backpack] Order updates WebSocket error: ${err.message}`, MessageType.Error);
				onError?.(err);
			},
		);
	}

	private _mapBackpackStatus(status: string): UnifiedOrderUpdate['status'] {
		const map: Record<string, UnifiedOrderUpdate['status']> = {
			New: 'new',
			PartiallyFilled: 'partiallyFilled',
			Filled: 'filled',
			Cancelled: 'cancelled',
			Expired: 'expired',
		};
		return map[status] || 'rejected';
	}
}
