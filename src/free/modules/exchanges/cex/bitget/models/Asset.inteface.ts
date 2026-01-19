export interface Asset {
	coin: string;
	available: string;
	frozen: string;
	locked: string;
	limitAvailable: string;
	uTime: string;
}

export interface SubaccountAssets {
	userId: number;
	assetsList: Asset[];
}
