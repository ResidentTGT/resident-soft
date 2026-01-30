import { Exchange } from './exchange.enum';

export interface ArbitrageOpportunity {
	timestamp: number;
	buyExchange: Exchange;
	sellExchange: Exchange;
	buySymbol: string; // trading symbol on buy exchange
	sellSymbol: string; // trading symbol on sell exchange
	buyPrice: number; // ask price (we buy here)
	sellPrice: number; // bid price (we sell here)
	volume: number; // min(buyQty, sellQty)
	netSpread: number; // sellRevenue - buyCost (after fees, per unit)
	netSpreadPercent: number; // (netSpread / buyPrice) * 100
	profitUsd: number; // netSpread * volume
	totalFees: number; // total fees for full cycle (4x taker fee)
}

export interface ArbitrageConfig {
	timeWindowMs: number; // max timestamp deviation between exchanges
	targetProfitPercent: number; // minimum NET profit % after all fees (4x taker)
	maxExecutions?: number; // stop after N successful trades (0 or undefined = unlimited)
	maxTradeInPercentOfBalance: number; // percentage of balance to use (e.g., 50 = 50%)
	minTradeUsd: number; // minimum trade volume in USD
}

export interface ArbitrageAnalysis {
	config: ArbitrageConfig;
	opportunities: ArbitrageOpportunity[];
	summary: {
		totalSnapshots: number;
		totalOpportunities: number;
		avgSpreadPercent: number;
		maxSpreadPercent: number;
		totalGrossProfit: number;
		totalNetProfit: number;
		byBuyExchange: Partial<Record<Exchange, number>>;
	};
}
