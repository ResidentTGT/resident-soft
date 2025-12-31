export interface MarketInfo {
	market: Market;
	orderBook?: {
		bids: { price: string; size: string }[];
		asks: { price: string; size: string }[];
	};
	lastPrice?: number;
	volume?: number;
}

export interface OrderInfo {
	id: string;
	tokenID: string;
	market: string;
	side: string;
	price: string;
	size: string;
	sizeMatched: string;
	status: string;
	createdAt: number;
}

export interface MarketToken {
	outcome: string;
	price: number;
	token_id: string;
	winner: boolean;
}

export interface Market {
	accepting_order_timestamp: string | null;
	accepting_orders: boolean;
	active: boolean;
	archived: boolean;
	closed: boolean;
	condition_id: string;
	description: string;
	enable_order_book: boolean;
	end_date_iso: string;
	fpmm: string;
	game_start_time: string;
	icon: string;
	image: string;
	is_50_50_outcome: boolean;
	maker_base_fee: number;
	market_slug: string;
	minimum_order_size: number;
	minimum_tick_size: number;
	neg_risk: boolean;
	neg_risk_market_id: string;
	neg_risk_request_id: string;
	notifications_enabled: boolean;
	question: string;
	question_id: string;
	rewards: {
		max_spread: number;
		min_size: number;
		rates: any | null;
	};
	seconds_delay: number;
	tags: string[];
	taker_base_fee: number;
	tokens: MarketToken[];
}

export interface MarketOrderResponse {
	errorMsg: string;
	orderID: string;
	takingAmount: string;
	makingAmount: string;
	status: string;
	transactionsHashes: string[];
	success: boolean;
}

export interface Position {
	proxyWallet: string;
	asset: string;
	conditionId: string;
	size: number;
	avgPrice: number;
	initialValue: number;
	currentValue: number;
	cashPnl: number;
	percentPnl: number;
	totalBought: number;
	realizedPnl: number;
	percentRealizedPnl: number;
	curPrice: number;
	redeemable: boolean;
	mergeable: boolean;
	title: string;
	slug: string;
	icon: string;
	eventSlug: string;
	outcome: string;
	outcomeIndex: number;
	oppositeOutcome: string;
	oppositeAsset: string;
	endDate: string;
	negativeRisk: boolean;
}
