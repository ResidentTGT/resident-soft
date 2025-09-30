import { ChainId } from '../network';

export interface FunctionParams {
	Common: {
		CheckBalances: {
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
		GenerateWallets: {
			amount: number;
		};
		RefuelGasZip: {
			amount: [number, number];
			minBalanceToKeep: [number, number];
			minAmountToSend: number;
			toChainIds: ChainId[];
		};
		RefuelManyGasZip: {
			amount: [number, number];
			toChainIds: ChainId[];
			addresses: string[];
		};
		RefuelRelayLink: {
			amount: [number, number];
			minBalanceToKeep: [number, number];
			minAmountToSend: number;
			toChainId: ChainId;
		};
		RefuelManyRelayLink: {
			amount: [number, number];
			toChainId: ChainId;
			addresses: string[];
		};
	};
	Evm: {
		SendToken: {
			token: string;
			amount: [number, number];
			minBalanceToKeep: [number, number];
			minAmountToSend: number;
			to: string;
		};
		CheckNft: {
			nftContract: string;
		};
		Wrap: {
			amount: [number, number];
		};
		Unwrap: {
			amount: [number, number];
		};
		Approve: {
			tokenSymbol: string;
			spender: string;
			amount: [number, number];
		};
		MakeTransaction: {
			contractAddress: string;
			data: string;
			value: number;
		};
	};
	Svm: {
		SendToken: {
			token: string;
			amount: [number, number];
			minBalanceToKeep: [number, number];
			minAmountToSend: number;
			to: string;
		};
	};
	Odos: {
		Swap: {
			token1: string;
			token2: string;
			amount: [number, number];
			slippageInPercent: number;
			minAmountForSwap: number;
		};
	};
	Exchanges: {
		Withdraw: {
			exchanges: string[];
			amount: [number, number];
			token: string;
			to: string;
			toChainId: string;
		};
	};
	Okx: {
		Withdraw: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	Bitget: {
		Withdraw: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	Gate: {
		Withdraw: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	Binance: {
		Withdraw: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	Bybit: {
		Withdraw: {
			amount: [number, number];
			token: string;
			to: string;
			toChainId: ChainId;
		};
	};
	CommonUi: {
		OpenPages: {
			browser: string;
			pageUrls: string[];
			loginInRabby: boolean;
			loginInPetra: boolean;
		};
		RestoreMetamask: {
			browser: string;
			closeBrowser: boolean;
		};
		LoginInMetamask: {
			browser: string;
		};
		RestorePetra: {
			browser: string;
			closeBrowser: boolean;
		};
		RestoreBackpack: {
			browser: string;
			closeBrowser: boolean;
		};
		RestoreArgent: {
			browser: string;
			closeBrowser: boolean;
		};
		RestoreRabby: {
			browser: string;
			closeBrowser: boolean;
		};
		LoginInRabby: {
			browser: string;
		};
	};
	AdsPower: {
		GetProfiles: {
			count: number;
		};
	};
	Vision: {
		GetProfiles: {
			token: string;
			folderId: string;
		};
	};
	Opensea: {
		OpenseaBuyByLink: {
			browser: string;
			links: string[];
		};
		SweepByLink: {
			browser: string;
			links: string[];
			count: number;
		};
		SellCollectionByLink: {
			browser: string;
			link: string;
		};
		ClaimUi: {
			browser: string;
		};
	};
	Twitter: any;
	Discord: any;
	Berachain: {
		FlyTradeSwap: {
			tokenSymbol1: string;
			tokenSymbol2: string;
			amount: [number, number];
		};
	};
	TEST: {
		TEST: any;
	};
	Plasma: {
		Deposit: {
			token: string;
			amount: string;
		};
	};
	ZksyncLite: {
		SendToken: {
			to: string;
		};
	};
}
