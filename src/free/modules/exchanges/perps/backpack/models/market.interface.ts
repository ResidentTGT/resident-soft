export interface BackpackMeanMarkPriceBand {
	maxMultiplier: string;
	minMultiplier: string;
}

export interface BackpackMeanPremiumBand {
	tolerancePct: string;
}

export interface BackpackPriceFilters {
	borrowEntryFeeMaxMultiplier: string | null;
	borrowEntryFeeMinMultiplier: string | null;
	maxImpactMultiplier: string;
	maxMultiplier: string;
	maxPrice: string;
	meanMarkPriceBand: BackpackMeanMarkPriceBand;
	meanPremiumBand: BackpackMeanPremiumBand;
	minImpactMultiplier: string;
	minMultiplier: string;
	minPrice: string;
	tickSize: string;
}

export interface BackpackQuantityFilters {
	maxQuantity: string | null;
	minQuantity: string;
	stepSize: string;
}

export interface BackpackMarketFilters {
	price: BackpackPriceFilters;
	quantity: BackpackQuantityFilters;
}

export interface BackpackImfMmfFunction {
	base: string;
	factor: string;
	type: string;
}

export interface BackpackMarket {
	baseSymbol: string;
	createdAt: string;
	filters: BackpackMarketFilters;
	fundingInterval: number;
	fundingRateLowerBound: string;
	fundingRateUpperBound: string;
	imfFunction: BackpackImfMmfFunction;
	marketType: string;
	mmfFunction: BackpackImfMmfFunction;
	openInterestLimit: string;
	orderBookState: string;
	positionLimitWeight: string;
	quoteSymbol: string;
	symbol: string;
	visible: boolean;
}
