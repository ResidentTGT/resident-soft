import WebSocket from 'ws';
import fs from 'fs';
import { Logger, MessageType } from '@utils/logger';
import { Backpack } from '../backpack/backpack';
import { Extended } from '../extended/extended';
import { BackpackAdapter, ExtendedAdapter } from './adapters';
import { toChartData, renderChart } from './chart';
import {
	Exchange,
	UnifiedOrderbook,
	ArbitrageConfig,
	OrderbookChartData,
	ChartPoint,
	ExchangeAdapter,
	SymbolsMap,
	SubscriptionsMap,
	ArbitrageOpportunity,
	OpportunityDetectionConfig,
	ArbitrageAnalysis,
	ExecutionResult,
	OpenedPosition,
	OrderFillResult,
	UnifiedOrderUpdate,
} from './models';
import { shouldClosePositions, checkPairOpportunities, calculateOpportunityWithClosingFees } from './calculator';

export {
	Exchange,
	UnifiedOrderbook,
	ArbitrageConfig,
	OrderbookChartData,
	ChartPoint,
	SymbolsMap,
	SubscriptionsMap,
	ArbitrageOpportunity,
	OpportunityDetectionConfig,
	ArbitrageAnalysis,
	ExecutionResult,
	OpenedPosition,
};

export interface CollectOptions {
	config?: OpportunityDetectionConfig;
	onOpportunity?: (opp: ArbitrageOpportunity) => void;
	onError?: (exchange: Exchange, error: Error) => void;
	outputPath?: string; // save data and opportunities to JSON file
}

export interface CollectResult {
	data: UnifiedOrderbook[];
	opportunities: ArbitrageOpportunity[];
}
export { toChartData, renderChart };
export {
	EXCHANGES_FEES,
	findOpportunities,
	analyzeOpportunities,
	calculateOpportunity,
	calculateOpportunityWithClosingFees,
	shouldClosePositions,
	checkPairOpportunities,
	getGrossSpread,
	getGrossSpreadPercent,
	getGrossProfit,
} from './calculator';

export interface LiveExecutionConfig extends OpportunityDetectionConfig {
	singleExecution?: boolean; // Stop after first successful trade (for testing)
}

export class Arbitrage {
	private _adapters = new Map<Exchange, ExchangeAdapter>();
	private _logger = Logger.getInstance();
	private _isExecuting = false; // Prevents multiple simultaneous executions

	// Order stream subscriptions (persistent for the session lifecycle)
	private _orderSubscriptions = new Map<Exchange, WebSocket>();

	/** Buffer of recent order events from all exchanges (TTL 60s) */
	private _orderEvents: UnifiedOrderUpdate[] = [];

	/** Latest orderbook data for each exchange (updated by WebSocket callbacks) */
	private _latestOrderbooks = new Map<Exchange, UnifiedOrderbook>();

	constructor(config: ArbitrageConfig) {
		if (config.backpack) {
			this._adapters.set(Exchange.Backpack, new BackpackAdapter(new Backpack(config.backpack)));
		}
		if (config.extended) {
			this._adapters.set(Exchange.Extended, new ExtendedAdapter(new Extended(config.extended)));
		}

		const exchangeNames = Array.from(this._adapters.keys()).join(', ') || 'none';
		this._logger.log(`Arbitrage initialized with exchanges: ${exchangeNames}`);
	}

	get adapters(): Map<Exchange, ExchangeAdapter> {
		return this._adapters;
	}

	subscribe(
		symbols: SymbolsMap,
		onMessage: (data: UnifiedOrderbook) => void,
		onError?: (exchange: Exchange, error: Error) => void,
	): SubscriptionsMap {
		const result = new Map<Exchange, WebSocket>();

		for (const [exchange, symbol] of symbols) {
			const adapter = this._adapters.get(exchange);
			if (!adapter) {
				this._logger.log(`Exchange ${exchange} not configured, skipping`, MessageType.Warn);
				continue;
			}

			this._logger.log(`Subscribing to ${exchange} orderbook: ${symbol}`);
			const ws = adapter.subscribeOrderbook(symbol, onMessage, (err) => {
				this._logger.log(`${exchange} error: ${err.message}`, MessageType.Error);
				onError?.(exchange, err);
			});
			result.set(exchange, ws);
		}

		return result;
	}

	close(subs: SubscriptionsMap): void {
		// Close orderbook subscriptions
		for (const ws of subs.values()) {
			ws.close();
		}

		// Close order stream subscriptions
		for (const ws of this._orderSubscriptions.values()) {
			ws.close();
		}
		this._orderSubscriptions.clear();

		// Clear the event buffer
		this._orderEvents = [];

		// Clear the latest orderbooks cache
		this._latestOrderbooks.clear();
	}

	/**
	 * Subscribe to order updates for all configured exchanges.
	 * Should be called together with orderbook subscriptions.
	 * The WebSocket connection stays open for the entire session.
	 */
	subscribeOrderStreams(symbols: SymbolsMap, onError?: (exchange: Exchange, error: Error) => void): void {
		for (const [exchange, symbol] of symbols) {
			const adapter = this._adapters.get(exchange);
			if (!adapter) continue;

			this._logger.log(`[subscribeOrderStreams] Subscribing to ${exchange} order updates: ${symbol}`);

			const ws = adapter.subscribeOrderUpdates(
				symbol,
				(update: UnifiedOrderUpdate) => this._handleOrderUpdate(update),
				(err) => {
					this._logger.log(`[subscribeOrderStreams] ${exchange} error: ${err.message}`, MessageType.Error);
					onError?.(exchange, err);
				},
			);

			this._orderSubscriptions.set(exchange, ws);
		}
	}

	/**
	 * Process incoming order updates from WebSocket.
	 * Simply adds events to buffer and cleans old ones.
	 */
	private _handleOrderUpdate(update: UnifiedOrderUpdate): void {
		this._orderEvents.push(update);

		// Clean old events (> 60 sec)
		const cutoff = Date.now() - 60000;
		this._orderEvents = this._orderEvents.filter((e) => e.timestamp > cutoff);
	}

	private async _waitForOrder(orderId: string, timeoutMs = 10000): Promise<UnifiedOrderUpdate | null> {
		const start = Date.now();

		while (Date.now() - start < timeoutMs) {
			// Ищем filled событие
			const filledEvent = this._orderEvents.find((e) => e.orderId === orderId && e.status === 'filled');
			if (filledEvent) return filledEvent;

			// Ищем терминальное событие (ошибка)
			const failedEvent = this._orderEvents.find(
				(e) => e.orderId === orderId && (e.status === 'cancelled' || e.status === 'rejected' || e.status === 'expired'),
			);
			if (failedEvent) return null;

			// Ждём следующий тик
			await new Promise((r) => setTimeout(r, 10));
		}

		this._logger.log(`[WSS] Order ${orderId} TIMEOUT after ${timeoutMs}ms`, MessageType.Error);
		return null;
	}

	/**
	 * Check if order streams are connected for given exchanges
	 */
	private _hasOrderStreams(exchanges: Exchange[]): boolean {
		return exchanges.every((ex) => this._orderSubscriptions.has(ex));
	}

	collect(symbols: SymbolsMap, durationMs: number, options?: CollectOptions): Promise<CollectResult> {
		return new Promise((resolve) => {
			const data: UnifiedOrderbook[] = [];
			const opportunities: ArbitrageOpportunity[] = [];
			const config = options?.config;

			this._logger.log(
				`Starting data collection${config ? ' with opportunity detection' : ''} for ${durationMs / 1000} s...`,
			);

			const subs = this.subscribe(
				symbols,
				(orderbook) => {
					data.push(orderbook);

					if (config) {
						this._latestOrderbooks.set(orderbook.exchange, orderbook);
						this._detectAndNotify(config, (opp) => {
							if (options?.onOpportunity) {
								options.onOpportunity(opp);
							} else {
								opportunities.push(opp);
							}
						});
					}
				},
				options?.onError,
			);

			setTimeout(() => {
				this.close(subs);
				this._logCollectionStats(data);
				if (config) {
					this._logger.log(`Detected ${opportunities.length} arbitrage opportunities`);
				}

				const result = { data, opportunities };

				if (options?.outputPath) {
					fs.writeFileSync(options.outputPath, JSON.stringify(result, null, 2));
					this._logger.log(`Saved to ${options.outputPath}`);
				}

				resolve(result);
			}, durationMs);
		});
	}

	monitor(
		symbols: SymbolsMap,
		config: OpportunityDetectionConfig,
		onOpportunity: (opp: ArbitrageOpportunity) => void,
		onError?: (exchange: Exchange, error: Error) => void,
	): SubscriptionsMap {
		this._logger.log('Starting real-time arbitrage monitoring...');

		return this.subscribe(
			symbols,
			(orderbook) => {
				this._latestOrderbooks.set(orderbook.exchange, orderbook);
				this._detectAndNotify(config, onOpportunity);
			},
			onError,
		);
	}

	private _detectAndNotify(config: OpportunityDetectionConfig, onOpportunity: (opp: ArbitrageOpportunity) => void): void {
		const orderbooks = Array.from(this._latestOrderbooks.values());
		if (orderbooks.length < 2) return;

		// Check all pairs of exchanges
		for (let i = 0; i < orderbooks.length; i++) {
			for (let j = i + 1; j < orderbooks.length; j++) {
				// Check for stale data
				const timeDiff = Math.abs(orderbooks[i].timestamp - orderbooks[j].timestamp);
				if (timeDiff > config.timeWindowMs) continue;

				for (const opp of checkPairOpportunities(orderbooks[i], orderbooks[j], config.minSpreadPercent)) {
					onOpportunity(opp);
				}
			}
		}
	}

	private _logCollectionStats(data: UnifiedOrderbook[]): void {
		const counts = new Map<Exchange, number>();
		for (const item of data) {
			counts.set(item.exchange, (counts.get(item.exchange) || 0) + 1);
		}

		const stats = Array.from(counts.entries())
			.map(([ex, count]) => `${ex}: ${count}`)
			.join(', ');

		this._logger.log(`Data collection finished. Total: ${data.length} points (${stats})`);
	}

	/**
	 * Monitor for opportunities and execute them automatically
	 * Full cycle: detect -> execute -> monitor exit -> close
	 *
	 * ## ARBITRAGE FLOW
	 *
	 * 1. **DETECTION**: Monitor orderbooks, find spread > minSpreadPercent (after 4x fees)
	 *    - Spread = sellExchange.bid - buyExchange.ask
	 *    - Must cover: open buy fee + open sell fee + close sell fee + close buy fee
	 *
	 * 2. **OPENING**: Place 2 market orders in parallel:
	 *    - BUY on exchange with low ask  → opens LONG position
	 *    - SELL on exchange with high bid → opens SHORT position
	 *    - If one fails → ROLLBACK (close the other)
	 *
	 * 3. **EXIT MONITORING**: Check spread every 100ms
	 *    - Track: currentSpread = sellExchange.bid - buyExchange.ask
	 *    - Close when: currentSpread <= 0 (spread has converged/reversed)
	 *
	 * 4. **CLOSING**: Close both positions in parallel:
	 *    - SELL our LONG position (on buyExchange)
	 *    - BUY to close our SHORT (on sellExchange)
	 *
	 * 5. **P&L CALCULATION**:
	 *    - LONG P&L  = (closePrice - openPrice) * quantity
	 *    - SHORT P&L = (openPrice - closePrice) * quantity
	 *    - Total = LONG P&L + SHORT P&L - fees
	 *
	 * @param symbols - Map of exchange to symbol
	 * @param liveExecutionConfig - Calculator config + slippage
	 * @param onCycleComplete - Called when a full cycle completes (optional)
	 * @param onError - Called on errors (optional)
	 * @returns SubscriptionsMap to close monitoring
	 */
	async monitorAndExecute(
		symbols: SymbolsMap,
		liveExecutionConfig: LiveExecutionConfig,
		onCycleComplete?: (result: ExecutionResult, pnl: number) => void,
		onError?: (exchange: Exchange, error: Error) => void,
	): Promise<{ subs: SubscriptionsMap; completed?: Promise<void> }> {
		// Warmup Extended adapter if present (WASM + market cache)
		const extendedAdapter = this._adapters.get(Exchange.Extended) as ExtendedAdapter | undefined;
		if (extendedAdapter) {
			await this._logger.log('[monitorAndExecute] Warming up Extended...');
			await extendedAdapter.warmup();
		}

		this._logger.log(
			`[monitorAndExecute] Config: minSpread=${liveExecutionConfig.minSpreadPercent}%, timeWindow=${liveExecutionConfig.timeWindowMs}ms`,
		);
		if (liveExecutionConfig.singleExecution) {
			this._logger.log('[monitorAndExecute] Single execution mode: will stop after first trade');
		}

		// Promise that resolves when singleExecution completes
		let resolveCompleted: (() => void) | undefined;
		const completed = liveExecutionConfig.singleExecution
			? new Promise<void>((resolve) => {
					resolveCompleted = resolve;
				})
			: undefined;

		// Subscribe to orderbook streams (market data)
		const subs = this.subscribe(
			symbols,
			(orderbook) => {
				this._latestOrderbooks.set(orderbook.exchange, orderbook);
				this._checkAndExecute(liveExecutionConfig, subs, resolveCompleted, onCycleComplete);
			},
			onError,
		);

		this.subscribeOrderStreams(symbols, onError);

		return { subs, completed };
	}

	private async _checkAndExecute(
		config: LiveExecutionConfig,
		subs: SubscriptionsMap,
		resolveCompleted?: () => void,
		onCycleComplete?: (result: ExecutionResult, pnl: number) => void,
	): Promise<void> {
		if (this._isExecuting) {
			return;
		}

		const orderbooks = Array.from(this._latestOrderbooks.values());

		if (orderbooks.length < 2) {
			this._logger.log(`[_checkAndExecute] Skipped: need at least 2 exchanges, have ${orderbooks.length}`);
			return;
		}

		// Check all pairs
		for (let i = 0; i < orderbooks.length; i++) {
			for (let j = i + 1; j < orderbooks.length; j++) {
				if (this._isExecuting) return;

				const timeDiff = Math.abs(orderbooks[i].timestamp - orderbooks[j].timestamp);

				if (timeDiff > config.timeWindowMs) {
					this._logger.log(
						`[_checkAndExecute] Skipped pair: stale data (${timeDiff}ms > ${config.timeWindowMs}ms)`,
						MessageType.Warn,
					);
					continue;
				} else {
					this._logger.log(`[_checkAndExecute] Checking pair:  (${timeDiff}ms < ${config.timeWindowMs}ms)`);
				}

				// Use 4x fee calculation for realistic profit
				const opp1 = calculateOpportunityWithClosingFees(orderbooks[i], orderbooks[j]);
				const opp2 = calculateOpportunityWithClosingFees(orderbooks[j], orderbooks[i]);

				const opp = opp1 ?? opp2;

				if (opp)
					this._logger.log(
						`[_checkAndExecute] >>> OPPORTUNITY FOUND: volume=${opp.volume}, net spread: ${opp.netSpread.toFixed(6)} (${opp.netSpreadPercent.toFixed(4)}%), profitUsd=$${opp.profitUsd.toFixed(2)},Input: ${opp.buyExchange}.ask=${opp.buyPrice}, ${opp.sellExchange}.bid=${opp.sellPrice}`,
					);

				if (opp1 && opp1.netSpreadPercent >= config.minSpreadPercent) {
					await this._executeOpportunity(opp1, config, subs, resolveCompleted, onCycleComplete);
					return;
				}

				if (opp2 && opp2.netSpreadPercent >= config.minSpreadPercent) {
					await this._executeOpportunity(opp2, config, subs, resolveCompleted, onCycleComplete);
					return;
				}
			}
		}
	}

	private async _executeOpportunity(
		opportunity: ArbitrageOpportunity,
		config: LiveExecutionConfig,
		subs: SubscriptionsMap,
		resolveCompleted?: () => void,
		onCycleComplete?: (result: ExecutionResult, pnl: number) => void,
	): Promise<void> {
		this._isExecuting = true;
		this._logger.log('[EXEC] === EXECUTION STARTED ===');

		try {
			this._logger.log('[EXEC] Phase 1: Opening positions...');
			const positions = await this._openPositions(opportunity);
			this._logger.log(`[EXEC] Phase 1 complete: Positions opened at ${new Date(positions.openedAt).toISOString()}`);

			this._logger.log('[EXEC] Phase 2: Monitoring for exit condition...');
			const pnl = await this._monitorAndClosePositions(positions);
			this._logger.log('[EXEC] Phase 2 complete: Exit triggered, PnL calculated');

			this._logger.log(`[EXEC] Cycle complete. Realized PnL: $${pnl.toFixed(2)}`);

			onCycleComplete?.(positions, pnl);

			// Stop after first successful trade if singleExecution is enabled
			if (config.singleExecution) {
				this._logger.log('[EXEC] Single execution mode: stopping monitoring...');
				this.close(subs);
				resolveCompleted?.();
			}
		} catch (error) {
			const err = error as Error;
			this._logger.log('[EXEC] === EXECUTION FAILED ===', MessageType.Error);
			this._logger.log(`[EXEC] Error: ${err.message}`, MessageType.Error);
		} finally {
			this._logger.log('[EXEC] === EXECUTION ENDED ===');
			this._isExecuting = false;
		}
	}

	/**
	 * Close all positions on both exchanges.
	 * Unified method used for both rollback and normal closing flows.
	 * @returns Tuple of [buyCloseResult, sellCloseResult]
	 */
	private async _closeAllPositions(
		buyExchange: Exchange,
		sellExchange: Exchange,
		buySymbol: string,
		sellSymbol: string,
	): Promise<[OrderFillResult | null, OrderFillResult | null]> {
		this._logger.log('[CLOSE] === CLOSING POSITIONS ===');

		const buyAdapter = this._adapters.get(buyExchange);
		const sellAdapter = this._adapters.get(sellExchange);

		if (!buyAdapter || !sellAdapter) {
			throw new Error(`Missing adapter for closing: ${!buyAdapter ? buyExchange : sellExchange}`);
		}

		const closeStartTime = Date.now();

		const results = await Promise.all([
			this._closePositionWithRetry(buyAdapter, buySymbol),
			this._closePositionWithRetry(sellAdapter, sellSymbol),
		]);

		this._logger.log(`[CLOSE] All positions closed in ${Date.now() - closeStartTime}ms`);
		this._logger.log('[CLOSE] === POSITIONS CLOSED ===');

		return results;
	}

	private async _openPositions(opportunity: ArbitrageOpportunity): Promise<ExecutionResult> {
		const { buyExchange, sellExchange, buySymbol, sellSymbol, buyPrice, sellPrice, volume } = opportunity;

		const buyAdapter = this._adapters.get(buyExchange);
		const sellAdapter = this._adapters.get(sellExchange);

		if (!buyAdapter || !sellAdapter) {
			throw new Error(`Missing adapter: ${!buyAdapter ? buyExchange : sellExchange}`);
		}

		if (!this._hasOrderStreams([buyExchange, sellExchange])) {
			throw new Error('Order streams not connected');
		}

		const volumeStr = '10'; // TODO: use volume
		if (volume < +volumeStr) throw new Error('Volume too small');

		const orderStartTime = Date.now();
		const [buyResult, sellResult] = await Promise.allSettled([
			buyAdapter.placeMarketOrder(buySymbol, 'buy', volumeStr, buyPrice.toString()),
			sellAdapter.placeMarketOrder(sellSymbol, 'sell', volumeStr, sellPrice.toString()),
		]);

		if (buyResult.status === 'rejected' || sellResult.status === 'rejected') {
			this._logger.log('[ROLLBACK] Order failed, closing any opened positions...', MessageType.Warn);
			await this._closeAllPositions(buyExchange, sellExchange, buySymbol, sellSymbol);
			this._logger.log('[ROLLBACK] === ROLLBACK COMPLETE ===');
			throw new Error(
				`REST error:${buyResult.status === 'rejected' ? ` buy=${buyResult.reason}` : ''}${sellResult.status === 'rejected' ? ` sell=${sellResult.reason}` : ''}`,
			);
		}

		const buyOrderId = buyResult.value;
		const sellOrderId = sellResult.value;

		this._logger.log(`[_openPositions] Orders placed in ${Date.now() - orderStartTime}ms, waiting for WSS...`);

		const [buyOrder, sellOrder] = await Promise.all([this._waitForOrder(buyOrderId), this._waitForOrder(sellOrderId)]);

		if (!buyOrder || !sellOrder) {
			this._logger.log('[ROLLBACK] WSS confirmation failed, closing any opened positions...', MessageType.Warn);
			await this._closeAllPositions(buyExchange, sellExchange, buySymbol, sellSymbol);
			this._logger.log('[ROLLBACK] === ROLLBACK COMPLETE ===');
			throw new Error(`Order failed:${!buyOrder ? ' buy' : ''}${!sellOrder ? ' sell' : ''}`);
		}

		this._logger.log(
			`[_openPositions] LONG: ${buyExchange} qty=${buyOrder.filledQuantity} entry=${buyOrder.avgPrice}$, SHORT: ${sellExchange} qty=${sellOrder.filledQuantity} entry=${sellOrder.avgPrice}$`,
		);

		return {
			opportunity,
			buyPosition: {
				exchange: buyExchange,
				symbol: buySymbol,
				side: 'long',
				quantity: buyOrder.filledQuantity,
				entryPrice: buyOrder.avgPrice,
				orderId: buyOrder.orderId,
			},
			sellPosition: {
				exchange: sellExchange,
				symbol: sellSymbol,
				side: 'short',
				quantity: sellOrder.filledQuantity,
				entryPrice: sellOrder.avgPrice,
				orderId: sellOrder.orderId,
			},
			openedAt: Date.now(),
		};
	}

	private async _monitorAndClosePositions(positions: ExecutionResult): Promise<number> {
		this._logger.log('[MONITOR_EXIT] === STARTING EXIT MONITORING ===');
		const startTime = Date.now();

		while (true) {
			const buyOrderbook = this._latestOrderbooks.get(positions.buyPosition.exchange);
			const sellOrderbook = this._latestOrderbooks.get(positions.sellPosition.exchange);

			if (buyOrderbook && sellOrderbook && shouldClosePositions(positions.opportunity, buyOrderbook, sellOrderbook)) {
				const currentSpread = sellOrderbook.bestBid.price - buyOrderbook.bestAsk.price;
				const holdDuration = Date.now() - startTime;
				this._logger.log(
					`[MONITOR_EXIT] >>> EXIT CONDITION TRIGGERED: spread=${currentSpread.toFixed(6)} <= 0 Hold duration: ${(holdDuration / 1000).toFixed(1)}s`,
				);

				const [buyCloseResult, sellCloseResult] = await this._closeAllPositions(
					positions.buyPosition.exchange,
					positions.sellPosition.exchange,
					positions.buyPosition.symbol,
					positions.sellPosition.symbol,
				);

				const pnl = this._calculatePnL(positions, buyCloseResult, sellCloseResult);
				this._logger.log(`[CLOSE] Total PnL: $${pnl}`);

				return pnl;
			}

			await new Promise((r) => setImmediate(r));
		}
	}

	/**
	 * Close a position with retry until WSS confirms fill.
	 * @param adapter - Exchange adapter
	 * @param symbol - Trading symbol
	 * @param maxRetries - Maximum retry attempts (default 10)
	 */
	private async _closePositionWithRetry(
		adapter: ExchangeAdapter,
		symbol: string,
		maxRetries = 10,
	): Promise<OrderFillResult | null> {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			const position = await adapter.getPosition(symbol);
			if (!position) return null;

			try {
				const closeOrder = await adapter.closePosition(position);
				if (!closeOrder) continue;

				const result = await this._waitForOrder(closeOrder, 10000);

				if (result) return result;
			} catch (error) {
				const err = error as Error;
				this._logger.log(`[CLOSE] attempt ${attempt} failed: ${err.message}`, MessageType.Warn);
			}
		}

		return null;
	}

	/**
	 * Calculate PnL from closed positions.
	 */
	private _calculatePnL(
		positions: ExecutionResult,
		buyCloseResult: OrderFillResult | null,
		sellCloseResult: OrderFillResult | null,
	): number {
		let pnl = 0;

		if (buyCloseResult?.avgPrice) {
			const closePrice = parseFloat(buyCloseResult.avgPrice);
			const entryPrice = parseFloat(positions.buyPosition.entryPrice);
			const quantity = parseFloat(positions.buyPosition.quantity);
			const buyPnl = (closePrice - entryPrice) * quantity;
			pnl += buyPnl;

			this._logger.log(`[CLOSE] LONG P&L breakdown: (${closePrice} - ${entryPrice}) * ${quantity} = $${buyPnl}`);
		}

		if (sellCloseResult?.avgPrice) {
			const closePrice = parseFloat(sellCloseResult.avgPrice);
			const entryPrice = parseFloat(positions.sellPosition.entryPrice);
			const quantity = parseFloat(positions.sellPosition.quantity);
			const sellPnl = (entryPrice - closePrice) * quantity;
			pnl += sellPnl;

			this._logger.log(`[CLOSE] SHORT P&L breakdown: (${entryPrice} - ${closePrice}) * ${quantity} = $${sellPnl}`);
		}

		return pnl;
	}
}
