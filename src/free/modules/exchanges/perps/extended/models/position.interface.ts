export type PositionSide = 'LONG' | 'SHORT';
export type PositionStatus = 'OPENED' | 'CLOSED';

export interface ExtendedPosition {
	id: number;
	accountId: number;
	market: string;
	status: PositionStatus;
	side: PositionSide;
	leverage: string;
	size: string;
	value: string;
	openPrice: string;
	markPrice: string;
	liquidationPrice: string;
	margin: string;
	unrealisedPnl: string;
	midPriceUnrealisedPnl: string;
	realisedPnl: string;
	adl: number;
	createdAt: number;
	updatedAt: number;
}
