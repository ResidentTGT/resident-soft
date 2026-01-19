export interface ExchangeAccount {
	profile: number;
	apiSecret: string;
	apiKey: string;
	kucoinPassphrase?: string;
	withdrawWallet: string;
	proxy: {
		host: string;
		port: number;
		login: string;
		password: string;
	};
}
