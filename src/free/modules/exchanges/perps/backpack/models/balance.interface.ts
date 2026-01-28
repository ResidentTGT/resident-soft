export interface TokenBalance {
	available: string;
	locked: string;
	staked: string;
}

export type Balances = Record<string, TokenBalance>;
