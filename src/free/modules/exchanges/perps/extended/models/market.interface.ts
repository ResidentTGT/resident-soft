export interface StarknetDomain {
	name: string;
	version: string;
	chainId: string;
	revision: number;
}

export interface MarketTradingConfig {
	minOrderSize: string;
	minOrderSizeChange: string;
	minPriceChange: string;
}

export interface MarketL2Config {
	collateralId: string;
	syntheticId: string;
	collateralResolution: number;
	syntheticResolution: number;
}

export interface MarketStats {
	askPrice: string;
	bidPrice: string;
	indexPrice: string;
	markPrice: string;
}

export interface Market {
	name: string;
	tradingConfig: MarketTradingConfig;
	l2Config: MarketL2Config;
	marketStats: MarketStats;
}

export interface Fees {
	market: string;
	makerFeeRate: string;
	takerFeeRate: string;
}

// API Response wrappers

export interface ExtendedApiResponse<T> {
	status: string;
	data: T;
}

export type MarketsApiResponse = ExtendedApiResponse<Market[]>;
export type FeesApiResponse = ExtendedApiResponse<Fees[]>;
