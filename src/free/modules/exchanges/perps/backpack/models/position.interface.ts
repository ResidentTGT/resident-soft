export interface Position {
	symbol: string;
	netQuantity: string; // positive = long, negative = short
	entryPrice: string;
	markPrice: string;
	estLiquidationPrice: string;
	pnlUnrealized: string;
	pnlRealized: string;
}
