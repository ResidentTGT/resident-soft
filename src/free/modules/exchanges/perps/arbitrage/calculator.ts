import { Exchange, UnifiedOrderbook } from './models';
import { ArbitrageOpportunity, ArbitrageAnalysis, OpportunityDetectionConfig } from './models/opportunity.interface';

/** Exchange fees as fractions (e.g. 0.0005 = 0.05%) */
export const EXCHANGES_FEES = {
	[Exchange.Backpack]: { maker: 0.0002, taker: 0.0005 },
	[Exchange.Extended]: { maker: 0, taker: 0.00025 },
};

/** Calculates gross spread (without fees) */
export const getGrossSpread = (opp: ArbitrageOpportunity): number => opp.sellPrice - opp.buyPrice;

/** Calculates gross spread percent (without fees) */
export const getGrossSpreadPercent = (opp: ArbitrageOpportunity): number => (getGrossSpread(opp) / opp.buyPrice) * 100;

/** Calculates gross profit (without fees) */
export const getGrossProfit = (opp: ArbitrageOpportunity): number => getGrossSpread(opp) * opp.volume;

/**
 * Groups orderbook data by time windows
 */
function groupByTimeWindow(data: UnifiedOrderbook[], windowMs: number): Map<number, UnifiedOrderbook[]> {
	const groups = new Map<number, UnifiedOrderbook[]>();

	for (const item of data) {
		const windowKey = Math.floor(item.timestamp / windowMs) * windowMs;
		const group = groups.get(windowKey);
		if (group) {
			group.push(item);
		} else {
			groups.set(windowKey, [item]);
		}
	}

	return groups;
}

/**
 * Checks both directions for arbitrage opportunities between two orderbooks
 * Returns array of profitable opportunities (0, 1, or 2 items)
 */
export function checkPairOpportunities(
	orderbook1: UnifiedOrderbook,
	orderbook2: UnifiedOrderbook,
	minSpreadPercent: number,
): ArbitrageOpportunity[] {
	const opportunities: ArbitrageOpportunity[] = [];

	const opp1 = calculateOpportunity(orderbook1, orderbook2);
	if (opp1 && opp1.netSpreadPercent >= minSpreadPercent) {
		opportunities.push(opp1);
	}

	const opp2 = calculateOpportunity(orderbook2, orderbook1);
	if (opp2 && opp2.netSpreadPercent >= minSpreadPercent) {
		opportunities.push(opp2);
	}

	return opportunities;
}

/**
 * Calculates arbitrage opportunity between two orderbooks (opening fees only - 2x)
 * Buy from `buy` exchange (at ask price), sell on `sell` exchange (at bid price)
 * Returns null if no profitable opportunity (netSpread <= 0)
 */
export function calculateOpportunity(buy: UnifiedOrderbook, sell: UnifiedOrderbook): ArbitrageOpportunity | null {
	const buyPrice = buy.bestAsk.price;
	const sellPrice = sell.bestBid.price;

	// Calculate net spread with fees
	const buyFee = EXCHANGES_FEES[buy.exchange].taker;
	const sellFee = EXCHANGES_FEES[sell.exchange].taker;

	const buyCost = buyPrice * (1 + buyFee);
	const sellRevenue = sellPrice * (1 - sellFee);
	const netSpread = sellRevenue - buyCost;

	// No arbitrage if net spread <= 0 (no profit after fees)
	if (netSpread <= 0) {
		return null;
	}

	const volume = Math.min(buy.bestAsk.quantity, sell.bestBid.quantity);

	return {
		timestamp: Math.max(buy.timestamp, sell.timestamp),
		buyExchange: buy.exchange,
		sellExchange: sell.exchange,
		buySymbol: buy.symbol,
		sellSymbol: sell.symbol,
		buyPrice,
		sellPrice,
		volume,
		netSpread,
		netSpreadPercent: (netSpread / buyPrice) * 100,
		profitUsd: netSpread * volume,
	};
}

/**
 * Calculates arbitrage opportunity with FULL fees (4x taker fees: open + close)
 *
 * Fee structure:
 * - Open buy (on buy exchange): buyPrice * buyFee
 * - Open sell (on sell exchange): sellPrice * sellFee
 * - Close sell (on buy exchange): ~avgPrice * buyFee
 * - Close buy (on sell exchange): ~avgPrice * sellFee
 *
 * Simplified: totalFees ≈ 2 * (buyFee + sellFee) * avgPrice
 *
 * Returns null if no profitable opportunity after all fees
 */
export function calculateOpportunityWithClosingFees(buy: UnifiedOrderbook, sell: UnifiedOrderbook): ArbitrageOpportunity | null {
	const buyPrice = buy.bestAsk.price;
	const sellPrice = sell.bestBid.price;

	const grossSpread = sellPrice - buyPrice;

	if (grossSpread <= 0) {
		return null;
	}

	// Calculate fees: 4x taker fee (open buy + open sell + close sell + close buy)
	const buyFee = EXCHANGES_FEES[buy.exchange].taker;
	const sellFee = EXCHANGES_FEES[sell.exchange].taker;
	const avgPrice = (buyPrice + sellPrice) / 2;
	const totalFees = (buyFee + sellFee) * avgPrice * 0; // *2 (disabled for testing)

	const netSpread = grossSpread - totalFees;
	const netSpreadPercent = (netSpread / buyPrice) * 100;

	if (netSpread <= 0) {
		return null;
	}

	const volume = Math.min(buy.bestAsk.quantity, sell.bestBid.quantity);
	const profitUsd = netSpread * volume;

	return {
		timestamp: Math.max(buy.timestamp, sell.timestamp),
		buyExchange: buy.exchange,
		sellExchange: sell.exchange,
		buySymbol: buy.symbol,
		sellSymbol: sell.symbol,
		buyPrice,
		sellPrice,
		volume,
		netSpread,
		netSpreadPercent,
		profitUsd,
	};
}

/**
 * Checks if positions should be closed based on current spread
 * Returns true when the original spread has disappeared or reversed
 *
 * Original arbitrage logic:
 * - We opened LONG on buyExchange (bought at buyExchange.ask)
 * - We opened SHORT on sellExchange (sold at sellExchange.bid)
 * - Original spread: sellExchange.bid - buyExchange.ask > 0
 *
 * Exit condition: Close when the spread disappears (converges to 0 or reverses)
 *
 * @param _openingOpp - The original opportunity (unused, kept for API compatibility)
 * @param currentBuy - Current orderbook of the exchange where we have a LONG position
 * @param currentSell - Current orderbook of the exchange where we have a SHORT position
 */
export function shouldClosePositions(
	_openingOpp: ArbitrageOpportunity,
	currentBuy: UnifiedOrderbook,
	currentSell: UnifiedOrderbook,
): boolean {
	const currentSpread = currentSell.bestBid.price - currentBuy.bestAsk.price;
	const shouldClose = currentSpread <= 0;

	return shouldClose;
}

/**
 * Finds latest orderbook for each exchange within a time window
 */
function getLatestByExchange(items: UnifiedOrderbook[]): Map<Exchange, UnifiedOrderbook> {
	const latest = new Map<Exchange, UnifiedOrderbook>();

	for (const item of items) {
		const existing = latest.get(item.exchange);
		if (!existing || item.timestamp > existing.timestamp) {
			latest.set(item.exchange, item);
		}
	}

	return latest;
}

/**
 * Finds arbitrage opportunities from collected orderbook data
 */
export function findOpportunities(data: UnifiedOrderbook[], config: OpportunityDetectionConfig): ArbitrageOpportunity[] {
	if (data.length === 0) {
		return [];
	}

	// Sort by timestamp
	const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

	// Group by time windows
	const groups = groupByTimeWindow(sorted, config.timeWindowMs);

	const opportunities: ArbitrageOpportunity[] = [];

	for (const items of groups.values()) {
		const latestByExchange = getLatestByExchange(items);
		const orderbooks = Array.from(latestByExchange.values());

		// Check all pairs of exchanges
		for (let i = 0; i < orderbooks.length; i++) {
			for (let j = i + 1; j < orderbooks.length; j++) {
				opportunities.push(...checkPairOpportunities(orderbooks[i], orderbooks[j], config.minSpreadPercent));
			}
		}
	}

	return opportunities;
}

/**
 * Performs full arbitrage analysis with summary statistics
 */
export function analyzeOpportunities(data: UnifiedOrderbook[], config: OpportunityDetectionConfig): ArbitrageAnalysis {
	const opportunities = findOpportunities(data, config);

	// Calculate summary statistics
	const byBuyExchange: Partial<Record<Exchange, number>> = {};

	let totalSpreadPercent = 0;
	let maxSpreadPercent = 0;
	let totalGrossProfit = 0;
	let totalNetProfit = 0;

	for (const opp of opportunities) {
		byBuyExchange[opp.buyExchange] = (byBuyExchange[opp.buyExchange] || 0) + 1;

		totalSpreadPercent += opp.netSpreadPercent;
		if (opp.netSpreadPercent > maxSpreadPercent) {
			maxSpreadPercent = opp.netSpreadPercent;
		}

		totalGrossProfit += getGrossProfit(opp);
		totalNetProfit += opp.profitUsd;
	}

	const totalSnapshots = new Set(data.map((d) => Math.floor(d.timestamp / config.timeWindowMs))).size;

	return {
		config,
		opportunities,
		summary: {
			totalSnapshots,
			totalOpportunities: opportunities.length,
			avgSpreadPercent: opportunities.length > 0 ? totalSpreadPercent / opportunities.length : 0,
			maxSpreadPercent,
			totalGrossProfit,
			totalNetProfit,
			byBuyExchange,
		},
	};
}
