export interface CoinInfo {
	coinId: string;
	coin: string;
	transfer: string;
	chains: [
		{
			chain: string;
			needTag: string;
			withdrawable: string;
			rechargeable: string;
			withdrawFee: string;
			extraWithdrawFee: string;
			depositConfirm: string;
			withdrawConfirm: string;
			minDepositAmount: string;
			minWithdrawAmount: string;
			browserUrl: string;
			contractAddress: string;
			withdrawStep: string;
			withdrawMinScale: string;
			congestion: string;
		},
	];
}
