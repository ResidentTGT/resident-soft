export interface OkxCurrencyInfo {
	canDep: boolean;
	canInternal: boolean;
	canWd: boolean;
	ccy: string;
	chain: string;
	depQuotaFixed: string;
	depQuoteDailyLayer2: string;
	logoLink: string;
	mainNet: boolean;
	maxFee: string;
	maxWd: string;
	minDep: string;
	minDepArrivalConfirm: string;
	minFee: string;
	minWd: string;
	minWdUnlockConfirm: string;
	name: string;
	needTag: boolean;
	usedDepQuotaFixed: string;
	usedWdQuota: string;
	wdQuota: string;
	wdTickSz: string;
}
