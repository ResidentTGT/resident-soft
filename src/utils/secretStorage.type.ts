import { Cex, Wallet } from '@utils/account';

export interface SecretStorage {
	mainEvmWallet?: Wallet;
	mainBinanceAccount?: Cex;
	mainOkxAccount?: Cex;
	mainBitgetAccount?: Cex;
	mainGateAccount?: Cex;
	cmcApiKey?: string;
	rucaptchaApiKey?: string;
	capSolverApiKey?: string;
	_2captchaApiKey?: string;
	etherscanApiKey?: string;
	polygonscanApiKey?: string;
	lineascanApiKey?: string;
	arbiscanApiKey?: string;
	basescanApiKey?: string;
	scrollscanApiKey?: string;
	berascanApiKey?: string;
	telegram?: {
		apiKey?: string;
		chatId?: string;
	};
	deepseekApiKey?: string;
	wssRpcUrl?: string;
}
