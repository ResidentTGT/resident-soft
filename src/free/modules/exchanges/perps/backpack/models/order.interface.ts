export type OrderSide = 'Bid' | 'Ask';
export type OrderType = 'Market' | 'Limit';
export type OrderEvenType =
	| 'orderAccepted'
	| 'orderCancelled'
	| 'orderExpired'
	| 'orderFill'
	| 'orderModified'
	| 'triggerPlaced'
	| 'triggerFailed';

export interface OrderRequest {
	symbol: string;
	side: OrderSide;
	orderType: OrderType;
	quantity: string;
	price?: string;
	reduceOnly?: boolean;
	clientId?: string;
}

export interface OrderResponse {
	id: string;
	orderType: OrderType;
	symbol: string;
	side: OrderSide;
	quantity: string;
	quoteQuantity: string;
	executedQuantity: string;
	executedQuoteQuantity: string;
	status: string;
	createdAt: number;
	timeInForce: string;
}

// WebSocket order update message
export interface BackpackOrderUpdateWs {
	stream: string; // "account.orderUpdate.SOL_USDC_PERP"
	data: {
		e: OrderEvenType; // Event type
		E: number; // Event time (microseconds)
		s: string; // Symbol
		i: string; // Order ID
		S: 'Bid' | 'Ask'; // Side
		o: string; // Order type
		X: string; // Status: New, Filled, PartiallyFilled, Cancelled, Expired
		q: string; // Quantity
		z: string; // Filled quantity
		Z: string; // Cumulative quote quantity
		T: number; // Transaction time (microseconds)
		L: string; // Fill price
	};
}
