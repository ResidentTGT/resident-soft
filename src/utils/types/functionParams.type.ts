import { ChainId } from '../network';

export interface FunctionParams {
	Common?: {
		CheckBalances?: {
			networks: [
				{
					chainId: ChainId;
					tokenNames: string[];
					tokenAlert: {
						symbol: string;
						less: boolean;
						amountAlert: number;
					};
				},
			];
		};
		GenerateWallets?: {
			amount: number;
		};
		RefuelGasZip?: {
			fromChainId: ChainId;
			amount: [number, number];
			minBalanceToKeep: [number, number];
			minAmountToSend: number;
			toChainIds: ChainId[];
		};
		RefuelManyGasZip?: {
			fromChainId: ChainId;
			amount: [number, number];
			toChainIds: ChainId[];
			addresses: string[];
		};
		RefuelRelayLink?: {
			amount: [number, number];
			minBalanceToKeep: [number, number];
			minAmountToSend: number;
			fromChainId: ChainId;
			toChainId: ChainId;
		};
		RefuelManyRelayLink?: {
			amount: [number, number];
			fromChainId: ChainId;
			toChainId: ChainId;
			addresses: string[];
		};
	};
	Evm?: {
		SendToken?: {
			fromChainId: ChainId;
			token: string;
			amount: [number, number];
			minBalanceToKeep: [number, number];
			minAmountToSend: number;
			to: string;
		};
		CheckNft?: {
			chainId: ChainId;
			nftContract: string;
		};
		Wrap?: {
			chainId: ChainId;
			amount: [number, number];
		};
		Unwrap?: {
			chainId: ChainId;
			amount: [number, number];
		};
		Approve?: {
			chainId: ChainId;
			tokenSymbol: string;
			spender: string;
			amount: [number, number];
		};
		MakeTransaction?: {
			chainId: ChainId;
			contractAddress: string;
			data: string;
			value: number;
		};
	};
	Svm?: {
		SendToken?: {
			chainId: ChainId;
			token: string;
			amount: [number, number];
			minBalanceToKeep: [number, number];
			minAmountToSend: number;
			to: string;
		};
	};
	Odos?: {
		Swap?: {
			chainId: ChainId;
			token1: string;
			token2: string;
			amount: [number, number];
			slippageInPercent: number;
			minAmountForSwap: number;
		};
	};
	Exchanges?: {
		Withdraw?: {
			exchanges: string[];
			amount: [number, number];
			token: string;
			to: string;
			toChainId: string;
		};
	};
	Okx?: {
		Withdraw?: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	Bitget?: {
		Withdraw?: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	Gate?: {
		Withdraw?: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	Binance?: {
		Withdraw?: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	Bybit?: {
		Withdraw?: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	CommonUi?: {
		OpenPages?: {
			browser: string;
			pageUrls: string[];
			loginInRabby: boolean;
			loginInPetra: boolean;
		};
		RestoreMetamask?: {
			browser: string;
			closeBrowser: boolean;
		};
		LoginInMetamask?: {
			browser: string;
		};
		RestorePetra?: {
			browser: string;
			closeBrowser: boolean;
		};
		RestoreBackpack?: {
			browser: string;
			closeBrowser: boolean;
		};
		RestoreArgent?: {
			browser: string;
			closeBrowser: boolean;
		};
		RestoreRabby?: {
			browser: string;
			closeBrowser: boolean;
		};
		LoginInRabby?: {
			browser: string;
		};
		RestorePhantom?: {
			browser: string;
			closeBrowser: boolean;
		};
	};
	AdsPower?: {
		GetProfiles?: {
			count: number;
		};
	};
	Vision?: {
		GetProfiles?: {
			token: string;
			folderId: string;
		};
	};
	Opensea?: {
		OpenseaBuyByLink?: {
			browser: string;
			links: string[];
		};
		SweepByLink?: {
			browser: string;
			links: string[];
			count: number;
		};
		SellCollectionByLink?: {
			browser: string;
			link: string;
		};
		ClaimUi?: {
			browser: string;
		};
	};

	Discord?: any;
	Berachain?: {
		FlyTradeSwap?: {
			tokenSymbol1: string;
			tokenSymbol2: string;
			amount: [number, number];
		};
	};
	TEST?: {
		TEST?: any;
	};
	Plasma?: {
		Deposit?: {
			token: string;
			amount: string;
		};
	};
	ZksyncLite?: {
		SendToken?: {
			to: string;
		};
	};
	Meteora?: {
		AddLiquidity?: {
			browser: string;
		};
	};
	Polymarket?: {
		ClaimUi?: {
			browser: string;
		};
	};
	Twitter?: {
		Login?: {
			browser: string;
			closeBrowser: boolean;
		};
		LoginByToken?: {
			browser: string;
			closeBrowser: boolean;
		};
		Follow?: {
			browser: string;
			profiles: string[];
		};
		Post?: {
			browser: string;
			message: string;
		};
		Quote?: {
			browser: string;
			message: string;
			tweetUrl: string;
		};
		LikeAndRetweet?: {
			browser: string;
			urls: string[];
			retweet: boolean;
		};
		Reply?: {
			browser: string;
			message: string;
			tweetUrl: string;
		};
	};
	Superchain?: {
		MakeTransactions?: {
			chainIds: ChainId[];
			count: number;
			forBadges: boolean;
			refuelFromChainId: ChainId;
			delayBetweenTransactions: [number, number];
		};
		ClaimUi?: {
			browser: string;
		};
	};
	Abstract?: {
		RegisterUi?: {
			browser: string;
		};
		RefuelGasZip?: {
			fromChainId: ChainId;
			amount: [number, number];
		};
		Vote?: {
			browser: string;
		};
		ConnectTwitter?: {
			browser: string;
		};
		Swap?: {
			browser: string;
			fromToken: string;
			toToken: string;
			amount: [number, number];
		};
		ClaimUi?: {
			browser: string;
			badgesIds?: number[];
		};
		CollectRedBullNft?: {
			browser: string;
			day: number;
		};
	};
	Afina?: {
		GetProfiles?: {
			apiKey: string;
		};
	};
}
