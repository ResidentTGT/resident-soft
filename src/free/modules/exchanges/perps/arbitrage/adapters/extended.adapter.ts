import WebSocket from 'ws';
import { Extended } from '../../extended/extended';
import { Orderbook } from '../../extended/models/orderbook.interface';
import { ExtendedUpdateWs } from '../../extended/models/order.interface';
import { Exchange, UnifiedOrderbook, ExchangeAdapter, PositionInfo, UnifiedOrderUpdate } from '../models';
import { Logger, MessageType } from '@utils/logger';

export class ExtendedAdapter implements ExchangeAdapter {
	readonly exchange = Exchange.Extended;
	readonly color = 'rgb(0, 255, 166)';
	private _logger = Logger.getInstance();

	constructor(private _client: Extended) {}

	async warmup(): Promise<void> {
		await this._client.warmup();
	}

	subscribeOrderbook(symbol: string, onMessage: (data: UnifiedOrderbook) => void, onError?: (error: Error) => void): WebSocket {
		this._logger.log(`[Extended] Subscribing to orderbook: ${symbol}`);

		return this._client.subscribeOrderbook(
			symbol,
			false, // not full orderbook, only top of book
			(data: Orderbook) => {
				const bids = data.data.b;
				const asks = data.data.a;

				if (!bids?.length || !asks?.length) {
					this._logger.log(
						`[Extended] Empty orderbook data received (bids=${bids?.length}, asks=${asks?.length})`,
						MessageType.Debug,
					);
					return;
				}

				const orderbook: UnifiedOrderbook = {
					exchange: Exchange.Extended,
					symbol: data.data.m,
					bestBid: {
						price: parseFloat(bids[0].p),
						quantity: parseFloat(bids[0].q),
					},
					bestAsk: {
						price: parseFloat(asks[0].p),
						quantity: parseFloat(asks[0].q),
					},
					timestamp: data.ts,
				};
				onMessage(orderbook);
			},
			(err) => {
				this._logger.log(`[Extended] WebSocket error: ${err.message}`, MessageType.Error);
				onError?.(err);
			},
		);
	}

	async placeMarketOrder(symbol: string, side: 'buy' | 'sell', quantity: string, price?: string): Promise<string> {
		if (!price) throw new Error('Extended requires price for market orders');

		const response = await this._client.placeMarketOrder(symbol, side, quantity, price);

		return response.externalId;
	}

	async closePosition(position: PositionInfo): Promise<string> {
		const response = await this._client.closePosition(position);

		return response.externalId;
	}

	async getPosition(symbol: string): Promise<PositionInfo | null> {
		const positions = await this._client.getPositions(symbol);
		const position = positions.find((p) => p.market === symbol && parseFloat(p.size) !== 0);

		if (!position) return null;

		const positionInfo: PositionInfo = {
			symbol,
			side: position.side === 'LONG' ? 'long' : 'short',
			quantity: Math.abs(parseFloat(position.size)).toString(),
			price: position.markPrice,
		};

		await this._logger.log(
			`[Extended] Position found: ${positionInfo.side} ${positionInfo.quantity} ${symbol}`,
			MessageType.Debug,
		);

		return positionInfo;
	}

	subscribeOrderUpdates(
		symbol: string,
		onMessage: (data: UnifiedOrderUpdate) => void,
		onError?: (error: Error) => void,
	): WebSocket {
		this._logger.log(`[Extended] Subscribing to order updates: ${symbol}`);

		return this._client.subscribeAccount(
			(data: ExtendedUpdateWs) => {
				if (data.type === 'ORDER') {
					const order = data.data.orders.find((o) => o.market === symbol);

					if (order) {
						const update: UnifiedOrderUpdate = {
							exchange: Exchange.Extended,
							orderId: order.externalId,
							symbol: order.market,
							side: order.side === 'BUY' ? 'buy' : 'sell',
							status: this._mapExtendedStatus(order.status),
							quantity: order.qty,
							filledQuantity: order.filledQty,
							avgPrice: order.averagePrice,
							timestamp: data.ts,
						};
						onMessage(update);
					}
				}
			},
			(err) => {
				this._logger.log(`[Extended] Order updates WebSocket error: ${err.message}`, MessageType.Error);
				onError?.(err);
			},
		);
	}

	private _mapExtendedStatus(status: string): UnifiedOrderUpdate['status'] {
		const map: Record<string, UnifiedOrderUpdate['status']> = {
			NEW: 'new',
			PARTIALLY_FILLED: 'partiallyFilled',
			FILLED: 'filled',
			CANCELLED: 'cancelled',
			REJECTED: 'rejected',
			EXPIRED: 'expired',
		};
		return map[status] || 'rejected';
	}

	async getAvailableBalance(): Promise<number> {
		const balance = await this._client.getBalance();

		return parseFloat(balance.availableForTrade);
	}

	async getStepSize(symbol: string): Promise<number> {
		const market = await this._client.getMarket(symbol);
		return parseFloat(market.tradingConfig.minOrderSizeChange);
	}
}
