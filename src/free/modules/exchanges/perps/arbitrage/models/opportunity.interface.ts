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
}

export interface OpportunityDetectionConfig {
	timeWindowMs: number; // max timestamp deviation between exchanges
	minSpreadPercent: number; // minimum NET spread % for filtering (after fees)
}

export interface ArbitrageAnalysis {
	config: OpportunityDetectionConfig;
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
