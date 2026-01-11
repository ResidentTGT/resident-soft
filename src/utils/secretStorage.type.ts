import type { Cex, Wallet } from './account/models';

export interface SecretStorage {
	mainEvmWallet?: Wallet;
	mainSvmWallet?: Wallet;
	mainBinanceAccount?: Cex;
	mainOkxAccount?: Cex;
	mainBitgetAccount?: Cex;
	mainGateAccount?: Cex;
	mainBybitAccount?: Cex;
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
