import { Exchange } from './exchange.enum';
import { ArbitrageOpportunity } from './opportunity.interface';

export interface OpenedPosition {
	exchange: Exchange;
	symbol: string;
	side: 'long' | 'short';
	quantity: string;
	entryPrice: string;
	orderId: string;
}

export interface ExecutionResult {
	opportunity: ArbitrageOpportunity;
	buyPosition: OpenedPosition;
	sellPosition: OpenedPosition;
	openedAt: number;
}

export interface OrderFillResult {
	orderId: string;
	filledQuantity: string;
	avgPrice: string;
	status: string;
}

export interface PositionInfo {
	symbol: string;
	side: 'long' | 'short';
	quantity: string; // Absolute quantity (always positive)
	price?: string;
}

export interface UnifiedOrderUpdate {
	exchange: Exchange;
	orderId: string;
	symbol: string;
	side: 'buy' | 'sell';
	status: 'new' | 'partiallyFilled' | 'filled' | 'cancelled' | 'rejected' | 'expired';
	quantity: string; // Requested quantity
	filledQuantity: string; // Filled so far
	avgPrice: string; // Average fill price
	timestamp: number; // Event timestamp in ms
}
