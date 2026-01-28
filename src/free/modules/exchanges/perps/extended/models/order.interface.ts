export type ExtendedOrderSide = 'buy' | 'sell';
export type ExtendedOrderType = 'MARKET' | 'LIMIT' | 'CONDITIONAL' | 'TPSL';
export type ExtendedOrderSideApi = 'BUY' | 'SELL';
export type TimeInForce = 'GTT' | 'IOC';

export interface OrderSettlement {
	signature: {
		r: string;
		s: string;
	};
	starkKey: string;
	collateralPosition: string;
}

export interface ExtendedOrderRequest {
	id: string;
	market: string;
	type: ExtendedOrderType;
	side: ExtendedOrderSideApi;
	qty: string;
	price: string;
	fee: string;
	expiryEpochMillis: number;
	timeInForce: TimeInForce;
	nonce: string;
	settlement: OrderSettlement;
	reduceOnly?: boolean;
	postOnly?: boolean;
}

export interface ExtendedCreateOrderResponse {
	status: string;
	data: {
		id: string;
		externalId: string;
	};
}

export type ExtendedOrderStatus =
	| 'NEW'
	| 'PARTIALLY_FILLED'
	| 'FILLED'
	| 'CANCELLED'
	| 'REJECTED'
	| 'EXPIRED'
	| 'UNTRIGGERED'
	| 'TRIGGERED';

export interface ExtendedOrderDetails {
	id: string;
	externalId: string;
	market: string;
	type: ExtendedOrderType;
	side: ExtendedOrderSideApi;
	status: ExtendedOrderStatus;
	statusReason: string;
	qty: string;
	filledQty: string;
	price: string;
	averagePrice: string;
	payedFee: string;
	reduceOnly: boolean;
	postOnly: boolean;
	createdTime: number;
	updatedTime: number;
}

export interface ExtendedOrderDetailsResponse {
	status: string;
	data: ExtendedOrderDetails;
}

export interface ExtendedOrderResponse {
	id: string;
	externalId: string;
}

type ExtendedUpdateTypeWs = 'ORDER' | 'BALANCE' | 'TRADE' | 'POSITION';

// WebSocket update message
export interface ExtendedUpdateWs {
	type: ExtendedUpdateTypeWs;
	ts: number;
	data: {
		isSnapshot: boolean;
		orders: [
			{
				id: number;
				accountId: number;
				externalId: string;
				market: string;
				type: ExtendedOrderType;
				side: ExtendedOrderSideApi;
				status: ExtendedOrderStatus;
				price: string;
				averagePrice: string;
				qty: string;
				filledQty: string;
				cancelledQty: string;
				reduceOnly: boolean;
				postOnly: boolean;
				createdTime: number;
				updatedTime: number;
				expireTime: number;
				timeInForce: string;
				payedFee: string;
			},
		];
		sourceEventId: number;
	};
}
