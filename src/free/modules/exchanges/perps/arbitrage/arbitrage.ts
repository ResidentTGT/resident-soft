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
	ExchangesConfig,
	OrderbookChartData,
	ChartPoint,
	ExchangeAdapter,
	SymbolsMap,
	SubscriptionsMap,
	ArbitrageOpportunity,
	ArbitrageConfig,
	ArbitrageAnalysis,
	ExecutionResult,
	OpenedPosition,
	OrderFillResult,
	UnifiedOrderUpdate,
} from './models';
import {
	shouldClosePositions,
	checkPairOpportunities,
	calculateOpportunityWithClosingFees,
	roundVolumeToStep,
	getStepDecimals,
} from './calculator';

export {
	Exchange,
	UnifiedOrderbook,
	ExchangesConfig,
	OrderbookChartData,
	ChartPoint,
	SymbolsMap,
	SubscriptionsMap,
	ArbitrageOpportunity,
	ArbitrageConfig,
	ArbitrageAnalysis,
	ExecutionResult,
	OpenedPosition,
};

export interface CollectOptions {
	config?: ArbitrageConfig;
	onOpportunity?: (opp: ArbitrageOpportunity) => void;
	onError?: (exchange: Exchange, error: Error) => void;
	outputPath?: string; // save data and opportunities to JSON file
}

export interface CollectResult {
	data: UnifiedOrderbook[];
	opportunities: ArbitrageOpportunity[];
}
export { toChartData, renderChart };
export { EXCHANGES_FEES, calculateOpportunityWithClosingFees, shouldClosePositions, checkPairOpportunities } from './calculator';

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

	/** Cached balances in USDC for each exchange */
	private _balances = new Map<Exchange, number>();

	/** Counter for executed trades (reset on each monitorAndExecute call) */
	private _executionCount = 0;

	/** Resolve function for completed promise (used with maxExecutions) */
	private _resolveCompleted?: () => void;

	constructor(config: ExchangesConfig) {
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

		// Clear the balances cache
		this._balances.clear();
	}

	/**
	 * Update cached balances from all configured exchanges.
	 * Called at startup and after closing positions.
	 */
	private async _updateBalances(): Promise<void> {
		const MAX_RETRIES = 3;
		const RETRY_DELAY_MS = 1000;

		const updates = Array.from(this._adapters.entries()).map(async ([exchange, adapter]) => {
			for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
				try {
					const balance = await adapter.getAvailableBalance();
					this._balances.set(exchange, balance);
					this._logger.log(`[BALANCE] ${exchange}: $${balance.toFixed(2)}`);
					return;
				} catch (error) {
					const err = error as Error;
					this._logger.log(
						`[BALANCE] ${exchange} attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`,
						MessageType.Warn,
					);

					if (attempt === MAX_RETRIES) {
						throw new Error(`Failed to get balance for ${exchange} after ${MAX_RETRIES} attempts: ${err.message}`);
					}

					await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
				}
			}
		});
		await Promise.all(updates);
	}

	/**
	 * Calculate trade volume based on available balances and opportunity.
	 * Rounds volume to unifiedStepSize to ensure both exchanges open same quantity.
	 * @param opportunity - Arbitrage opportunity with price and volume info
	 * @param config - Arbitrage config with trade limits
	 * @param unifiedStepSize - Maximum stepSize from both exchanges (for unified rounding)
	 * @returns Volume string formatted to stepSize decimal places
	 * @throws Error if calculated volume is below minTradeUsd
	 */
	private _calculateTradeVolume(opportunity: ArbitrageOpportunity, config: ArbitrageConfig, unifiedStepSize: number): string {
		const { buyExchange, sellExchange, buyPrice, volume } = opportunity;

		const buyBalanceUsd = this._balances.get(buyExchange);
		const sellBalanceUsd = this._balances.get(sellExchange);

		if (buyBalanceUsd === undefined) {
			throw new Error(`Balance not found for buy exchange: ${buyExchange}`);
		}
		if (sellBalanceUsd === undefined) {
			throw new Error(`Balance not found for sell exchange: ${sellExchange}`);
		}

		const minBalanceUsd = Math.min(buyBalanceUsd, sellBalanceUsd);

		const maxFromBalance = (minBalanceUsd * config.maxTradeInPercentOfBalance) / 100 / buyPrice;

		const finalVolume = Math.min(maxFromBalance, volume);

		// Round to unified stepSize (max of both exchanges) to ensure same quantity on both
		const roundedVolume = roundVolumeToStep(finalVolume, unifiedStepSize);
		const decimals = getStepDecimals(unifiedStepSize);

		const roundedVolumeUsd = roundedVolume * buyPrice;
		if (roundedVolumeUsd < config.minTradeUsd) {
			throw new Error(
				`Volume too small: $${roundedVolumeUsd.toFixed(2)} (${roundedVolume.toFixed(decimals)} tokens). minTradeUsd: ${config.minTradeUsd}$`,
			);
		}

		return roundedVolume.toFixed(decimals);
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

	private _detectAndNotify(config: ArbitrageConfig, onOpportunity: (opp: ArbitrageOpportunity) => void): void {
		const orderbooks = Array.from(this._latestOrderbooks.values());
		if (orderbooks.length < 2) return;

		// Check all pairs of exchanges
		for (let i = 0; i < orderbooks.length; i++) {
			for (let j = i + 1; j < orderbooks.length; j++) {
				// Check for stale data
				const timeDiff = Math.abs(orderbooks[i].timestamp - orderbooks[j].timestamp);
				if (timeDiff > config.timeWindowMs) continue;

				for (const opp of checkPairOpportunities(orderbooks[i], orderbooks[j], config.targetProfitPercent)) {
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
	 * 1. **DETECTION**: Monitor orderbooks, find spread > targetProfitPercent (after 4x fees)
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
	 * @param config - Arbitrage configuration (targetProfitPercent, timeWindowMs, maxExecutions)
	 * @param onError - Called on errors (optional)
	 * @returns SubscriptionsMap to close monitoring
	 */
	async monitorAndExecute(
		symbols: SymbolsMap,
		config: ArbitrageConfig,
		onError?: (exchange: Exchange, error: Error) => void,
	): Promise<{ subs: SubscriptionsMap; completed?: Promise<void> }> {
		// Reset execution counter for new monitoring session
		this._executionCount = 0;

		// Warmup Extended adapter if present (WASM + market cache)
		const extendedAdapter = this._adapters.get(Exchange.Extended) as ExtendedAdapter | undefined;
		if (extendedAdapter) {
			await this._logger.log('[monitorAndExecute] Warming up Extended...');
			await extendedAdapter.warmup();
		}

		const backpackAdapter = this._adapters.get(Exchange.Backpack) as BackpackAdapter | undefined;
		if (backpackAdapter) {
			await this._logger.log('[monitorAndExecute] Warming up Backpack...');
			await backpackAdapter.warmup();
		}

		await this._updateBalances();

		this._logger.log(
			`[monitorAndExecute] Config: targetProfit=${config.targetProfitPercent}%, timeWindow=${config.timeWindowMs}ms, balancePercent=${config.maxTradeInPercentOfBalance}%`,
		);
		if (config.maxExecutions) {
			this._logger.log(`[monitorAndExecute] Max executions: ${config.maxExecutions}`);
		}

		// Promise that resolves when maxExecutions is reached
		const completed = config.maxExecutions
			? new Promise<void>((resolve) => {
					this._resolveCompleted = resolve;
				})
			: undefined;

		// Subscribe to orderbook streams (market data)
		const subs = this.subscribe(
			symbols,
			(orderbook) => {
				this._latestOrderbooks.set(orderbook.exchange, orderbook);
				this._checkAndExecute(config, subs);
			},
			onError,
		);

		this.subscribeOrderStreams(symbols, onError);

		return { subs, completed };
	}

	private async _checkAndExecute(config: ArbitrageConfig, subs: SubscriptionsMap): Promise<void> {
		if (this._isExecuting) {
			return;
		}

		const orderbooks = Array.from(this._latestOrderbooks.values());

		if (orderbooks.length < 2) return;

		for (let i = 0; i < orderbooks.length; i++) {
			for (let j = i + 1; j < orderbooks.length; j++) {
				if (this._isExecuting) return;

				const timeDiff = Math.abs(orderbooks[i].timestamp - orderbooks[j].timestamp);

				if (timeDiff > config.timeWindowMs) {
					continue;
				} else {
					this._logger.log(`Checking pair:  (${timeDiff}ms < ${config.timeWindowMs}ms)`);
				}

				// Use 4x fee calculation for realistic profit
				const opp1 = calculateOpportunityWithClosingFees(orderbooks[i], orderbooks[j]);
				const opp2 = calculateOpportunityWithClosingFees(orderbooks[j], orderbooks[i]);

				for (const opp of [opp1, opp2]) {
					if (!opp) continue;

					if (opp.netSpreadPercent >= config.targetProfitPercent) {
						this._logger.log(
							`OPPORTUNITY FOUND: volume=${opp.volume}, net spread: ${opp.netSpread.toFixed(6)} (${opp.netSpreadPercent.toFixed(4)}%), profitUsd=$${opp.profitUsd.toFixed(2)}, Input: ${opp.buyExchange}.ask=${opp.buyPrice}, ${opp.sellExchange}.bid=${opp.sellPrice}`,
						);
						await this._executeOpportunity(opp, config, subs);
						return;
					}
				}
			}
		}
	}

	private async _executeOpportunity(
		opportunity: ArbitrageOpportunity,
		config: ArbitrageConfig,
		subs: SubscriptionsMap,
	): Promise<void> {
		this._isExecuting = true;

		try {
			await this._logger.log('[EXEC] Phase 1: Opening positions...');
			const positions = await this._openPositions(opportunity, config);
			await this._logger.log(`[EXEC] Phase 1 complete: Positions opened at ${new Date(positions.openedAt).toISOString()}`);

			await this._logger.log('[EXEC] Phase 2: Monitoring for exit condition...');
			const pnl = await this._monitorAndClosePositions(positions);
			await this._logger.log('[EXEC] Phase 2 complete: Exit triggered, PnL calculated');

			await this._logger.log(`[EXEC] Cycle complete. Realized PnL: $${pnl.toFixed(2)}`);

			// Increment execution counter and check if max reached
			this._executionCount++;
			this._logger.log(`[EXEC] Execution ${this._executionCount}/${config.maxExecutions || '∞'} complete`);

			if (config.maxExecutions && this._executionCount >= config.maxExecutions) {
				this._logger.log('[EXEC] Max executions reached, stopping...');
				this.close(subs);
				this._resolveCompleted?.();
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

	private async _openPositions(opportunity: ArbitrageOpportunity, config: ArbitrageConfig): Promise<ExecutionResult> {
		const { buyExchange, sellExchange, buySymbol, sellSymbol, buyPrice, sellPrice } = opportunity;

		const buyAdapter = this._adapters.get(buyExchange);
		const sellAdapter = this._adapters.get(sellExchange);

		if (!buyAdapter || !sellAdapter) {
			throw new Error(`Missing adapter: ${!buyAdapter ? buyExchange : sellExchange}`);
		}

		if (!this._hasOrderStreams([buyExchange, sellExchange])) {
			throw new Error('Order streams not connected');
		}

		// Get stepSize from both exchanges and use the maximum (coarsest precision)
		const [buyStepSize, sellStepSize] = await Promise.all([
			buyAdapter.getStepSize(buySymbol),
			sellAdapter.getStepSize(sellSymbol),
		]);
		const unifiedStepSize = Math.max(buyStepSize, sellStepSize);

		const volumeStr = this._calculateTradeVolume(opportunity, config, unifiedStepSize);

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
		let lastLogTime = startTime;
		const LOG_INTERVAL_MS = 5000;

		while (true) {
			const buyOrderbook = this._latestOrderbooks.get(positions.buyPosition.exchange);
			const sellOrderbook = this._latestOrderbooks.get(positions.sellPosition.exchange);

			if (buyOrderbook && sellOrderbook) {
				const check = shouldClosePositions(positions.opportunity, buyOrderbook, sellOrderbook);

				const now = Date.now();
				if (now - lastLogTime >= LOG_INTERVAL_MS) {
					const holdDuration = ((now - startTime) / 1000).toFixed(1);
					await this._logger.log(
						`[MONITOR_EXIT] Waiting... spread=${check.currentSpread.toFixed(6)} (${check.currentSpreadPercent.toFixed(4)}%), hold=${holdDuration}s`,
					);
					lastLogTime = now;
				}

				if (check.shouldClose) {
					const holdDuration = Date.now() - startTime;
					await this._logger.log(
						`[MONITOR_EXIT] >>> EXIT CONDITION TRIGGERED: spread=${check.currentSpread.toFixed(6)} <= 0 Hold duration: ${(holdDuration / 1000).toFixed(1)}s`,
					);

					const [buyCloseResult, sellCloseResult] = await this._closeAllPositions(
						positions.buyPosition.exchange,
						positions.sellPosition.exchange,
						positions.buyPosition.symbol,
						positions.sellPosition.symbol,
					);

					const pnl = this._calculatePnL(positions, buyCloseResult, sellCloseResult);

					await this._updateBalances();

					return pnl;
				}
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
	 * Returns net PnL after deducting all fees (4x taker fee).
	 */
	private _calculatePnL(
		positions: ExecutionResult,
		buyCloseResult: OrderFillResult | null,
		sellCloseResult: OrderFillResult | null,
	): number {
		let grossPnl = 0;

		if (buyCloseResult?.avgPrice) {
			const closePrice = parseFloat(buyCloseResult.avgPrice);
			const entryPrice = parseFloat(positions.buyPosition.entryPrice);
			const quantity = parseFloat(positions.buyPosition.quantity);
			const buyPnl = (closePrice - entryPrice) * quantity;
			grossPnl += buyPnl;

			this._logger.log(`[CLOSE] LONG P&L: (${closePrice} - ${entryPrice}) * ${quantity} = $${buyPnl.toFixed(4)}`);
		}

		if (sellCloseResult?.avgPrice) {
			const closePrice = parseFloat(sellCloseResult.avgPrice);
			const entryPrice = parseFloat(positions.sellPosition.entryPrice);
			const quantity = parseFloat(positions.sellPosition.quantity);
			const sellPnl = (entryPrice - closePrice) * quantity;
			grossPnl += sellPnl;

			this._logger.log(`[CLOSE] SHORT P&L: (${entryPrice} - ${closePrice}) * ${quantity} = $${sellPnl.toFixed(4)}`);
		}

		const totalFees = positions.opportunity.totalFees;
		const netPnl = grossPnl - totalFees;

		this._logger.log(`[CLOSE] Gross: $${grossPnl.toFixed(4)}, Fees: $${totalFees.toFixed(4)}, Net: $${netPnl.toFixed(4)}`);

		return netPnl;
	}
}
