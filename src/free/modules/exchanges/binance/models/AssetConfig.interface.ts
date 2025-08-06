export interface BinanceAssetConfig {
	free: string;
	locked: string;
	coin: string;
	freeze: string;
	ipoable: string;
	ipoing: string;
	isLegalMoney: boolean;
	depositAllEnable: boolean;
	name: string;
	networkList: {
		network: string;
		depositEnable: boolean;
		depositDesc: string;
		withdrawEnable: boolean;
		withdrawDesc: string;
		withdrawFee: string;
		withdrawMin: string;
		withdrawIntegerMultiple: string;
	}[];
}
