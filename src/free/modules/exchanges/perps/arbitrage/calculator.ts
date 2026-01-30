import { Exchange, UnifiedOrderbook } from './models';
import { ArbitrageOpportunity } from './models/opportunity.interface';

/** Exchange fees as fractions (e.g. 0.0005 = 0.05%) */
export const EXCHANGES_FEES = {
	[Exchange.Backpack]: { maker: 0.0002, taker: 0.0005 },
	[Exchange.Extended]: { maker: 0, taker: 0.00025 },
};

/**
 * Checks both directions for arbitrage opportunities between two orderbooks
 * Returns array of profitable opportunities (0, 1, or 2 items)
 */
export function checkPairOpportunities(
	orderbook1: UnifiedOrderbook,
	orderbook2: UnifiedOrderbook,
	targetProfitPercent: number,
): ArbitrageOpportunity[] {
	const opportunities: ArbitrageOpportunity[] = [];

	const opp1 = calculateOpportunityWithClosingFees(orderbook1, orderbook2);
	if (opp1 && opp1.netSpreadPercent >= targetProfitPercent) {
		opportunities.push(opp1);
	}

	const opp2 = calculateOpportunityWithClosingFees(orderbook2, orderbook1);
	if (opp2 && opp2.netSpreadPercent >= targetProfitPercent) {
		opportunities.push(opp2);
	}

	return opportunities;
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
	const totalFees = (buyFee + sellFee) * avgPrice * 2; // 4x taker fee total

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
		totalFees,
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
export interface ClosePositionsCheck {
	shouldClose: boolean;
	currentSpread: number;
	currentSpreadPercent: number;
}

export function shouldClosePositions(
	_openingOpp: ArbitrageOpportunity,
	currentBuy: UnifiedOrderbook,
	currentSell: UnifiedOrderbook,
): ClosePositionsCheck {
	const currentSpread = currentSell.bestBid.price - currentBuy.bestAsk.price;
	const currentSpreadPercent = (currentSpread / currentBuy.bestAsk.price) * 100;

	return {
		shouldClose: currentSpread <= 0,
		currentSpread,
		currentSpreadPercent,
	};
}
