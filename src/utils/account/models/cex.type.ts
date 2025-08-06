export interface CexApi {
	secretKey?: string;
	apiKey?: string;
	passPhrase?: string;
}

export interface Cex {
	email?: string;
	evmDepositAddress?: string;
	starknetDepositAddress?: string;
	suiDepositAddress?: string;
	aptosDepositAddress?: string;
	solanaDepositAddress?: string;
	api?: CexApi;
}
