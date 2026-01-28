export interface Balance {
	collateralName: string;
	balance: string;
	status: string;
	equity: string;
	spotEquity: string;
	spotEquityForAvailableForTrade: string;
	availableForTrade: string;
	availableForWithdrawal: string;
	unrealisedPnl: string;
	initialMargin: string;
	marginRatio: string;
	updatedTime: number;
	exposure: string;
	leverage: string;
}
