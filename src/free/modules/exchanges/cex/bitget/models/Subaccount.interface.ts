export interface BitgetSubAccount {
	subAccountUid: string;
	subAccountName: string;
	status: string;
	permList: ['read', 'spot_trade', 'contract_trade'];
	label: string;
	accountType: string;
	bindingTime: string;
	cTime: string;
	uTime: string;
}
