import { ChainId } from '../network';
import { FunctionParams } from './functionParams.type';

/**
 * Full template of FunctionParams structure with all fields and default values
 * This template reproduces the complete type structure from FunctionParams
 * Using satisfies ensures compile-time type safety
 */
export const FUNCTION_PARAMS_TEMPLATE: FunctionParams = {
	Common: {
		CheckBalances: {
			networks: [
				{
					chainId: ChainId.Ethereum,
					tokenNames: ['ETH'],
					tokenAlert: {
						symbol: '',
						less: false,
						amountAlert: 0,
					},
				},
			],
		},
		GenerateWallets: {
			amount: 1,
		},
	},
	Evm: {
		SendToken: {
			fromChainId: ChainId.Ethereum,
			token: 'ETH',
			amount: [0, 0],
			minBalanceToKeep: [0, 0],
			minAmountToSend: 0,
			to: '',
		},
		CheckNft: {
			chainId: ChainId.Ethereum,
			nftContract: '0x...',
		},
		Wrap: {
			chainId: ChainId.Ethereum,
			amount: [0, 0],
		},
		Unwrap: {
			chainId: ChainId.Ethereum,
			amount: [0, 0],
		},
		Approve: {
			chainId: ChainId.Ethereum,
			tokenSymbol: '',
			spender: '',
			amount: [0, 0],
		},
		MakeTransaction: {
			chainId: ChainId.Ethereum,
			contractAddress: '0x...',
			data: '0x...',
			value: 0,
		},
	},
	Svm: {
		SendToken: {
			chainId: ChainId.Solana,
			token: 'SOL',
			amount: [0, 0],
			minBalanceToKeep: [0, 0],
			minAmountToSend: 0,
			to: '',
		},
		SendTokenToMany: {
			chainId: ChainId.Solana,
			token: 'SOL',
			amount: [0, 0],
			to: [],
		},
	},
	CexDex: {
		Withdraw: {
			exchanges: ['Bitget'],
			amount: [0, 1],
			token: 'ETH',
			to: 'evm',
			toChainId: ChainId.Base,
		},
		OdosSwap: {
			chainId: ChainId.Base,
			token1: 'ETH',
			token2: 'USDC',
			amount: [0, 1],
			slippageInPercent: 0.5,
			minAmountForSwap: 0,
		},
	},
	CommonUi: {
		OpenPages: {
			browser: 'Vision',
			pageUrls: [],
			loginInRabby: false,
			loginInPetra: false,
		},
		RestoreMetamask: {
			browser: 'Vision',
			closeBrowser: false,
		},
		LoginInMetamask: {
			browser: 'Vision',
		},
		RestorePetra: {
			browser: 'Vision',
			closeBrowser: false,
		},
		RestoreBackpack: {
			browser: 'Vision',
			closeBrowser: false,
		},
		RestoreArgent: {
			browser: 'Vision',
			closeBrowser: false,
		},
		RestoreRabby: {
			browser: 'Vision',
			closeBrowser: false,
		},
		LoginInRabby: {
			browser: 'Vision',
		},
		RestorePhantom: {
			browser: 'Vision',
			closeBrowser: false,
		},
	},
	AdsPower: {
		GetProfiles: {
			count: 0,
		},
	},
	Vision: {
		GetProfiles: {
			token: '',
			folderId: '',
		},
	},
	Opensea: {
		OpenseaBuyByLink: {
			browser: 'Vision',
			links: [],
		},
		SweepByLink: {
			browser: 'Vision',
			links: [],
			count: 0,
		},
		SellCollectionByLink: {
			browser: 'Vision',
			link: '',
		},
		ClaimUi: {
			browser: 'Vision',
		},
	},
	Discord: {},
	Berachain: {
		FlyTradeSwap: {
			tokenSymbol1: '',
			tokenSymbol2: '',
			amount: [0, 0],
		},
	},
	TEST: {
		TEST: {},
	},
	Plasma: {
		Deposit: {
			token: '',
			amount: '',
		},
	},
	ZksyncLite: {
		SendToken: {
			to: '',
		},
	},
	Meteora: {
		AddLiquidity: {
			browser: 'Vision',
		},
	},
	Polymarket: {
		ClaimUi: {
			browser: 'Vision',
		},
	},
	Twitter: {
		Login: {
			browser: 'Vision',
			closeBrowser: false,
		},
		LoginByToken: {
			browser: 'Vision',
			closeBrowser: false,
		},
		Follow: {
			browser: 'Vision',
			profiles: [],
		},
		Post: {
			browser: 'Vision',
			message: '',
		},
		Quote: {
			browser: 'Vision',
			message: '',
			tweetUrl: '',
		},
		LikeAndRetweet: {
			browser: 'Vision',
			urls: [],
			retweet: false,
		},
		Reply: {
			browser: 'Vision',
			message: '',
			tweetUrl: '',
		},
	},
	Superchain: {
		MakeTransactions: {
			chainIds: [],
			count: 0,
			forBadges: false,
			refuelFromChainId: ChainId.Ethereum,
			delayBetweenTransactions: [0, 0],
		},
		ClaimUi: {
			browser: 'Vision',
		},
	},
	Abstract: {
		RegisterUi: {
			browser: 'Vision',
		},
		RefuelGasZip: {
			fromChainId: ChainId.Ethereum,
			amount: [0, 0],
		},
		Vote: {
			browser: 'Vision',
		},
		ConnectTwitter: {
			browser: 'Vision',
		},
		Swap: {
			browser: 'Vision',
			fromToken: '',
			toToken: '',
			amount: [0, 0],
		},
		ClaimUi: {
			browser: 'Vision',
			badgesIds: [],
		},
		CollectRedBullNft: {
			browser: 'Vision',
			day: 1,
		},
		SpeedTrading: {
			browser: 'Vision',
		},
	},
	Afina: {
		GetProfiles: {
			apiKey: '',
		},
	},
	Bridges: {
		Stargate: {
			fromChainId: ChainId.Base,
			fromToken: 'ETH',
			amount: [0, 1],
			minBalanceToKeep: [0, 0],
			minAmountToBridge: 0,
			toChainId: ChainId.Arbitrum,
			toToken: 'ETH',
			slippagePercent: 0.5,
		},
		RefuelGasZip: {
			fromChainId: ChainId.Ethereum,
			amount: [0, 1],
			minBalanceToKeep: [0, 0],
			minAmountToSend: 0,
			toChainId: ChainId.Base,
		},
		RefuelManyGasZip: {
			fromChainId: ChainId.Ethereum,
			amount: [0, 1],
			toChainId: ChainId.Base,
			addresses: [],
		},
		RefuelRelayLink: {
			amount: [0, 1],
			minBalanceToKeep: [0, 0],
			minAmountToSend: 0,
			fromChainId: ChainId.Ethereum,
			toChainId: ChainId.Base,
		},
		RefuelManyRelayLink: {
			amount: [0, 1],
			fromChainId: ChainId.Ethereum,
			toChainId: ChainId.Base,
			addresses: [],
		},
	},
	Symbiotic: {
		Withdraw: {
			chainId: ChainId.Ethereum,
			vaultAddr: '0xB26ff591F44b04E78de18f43B46f8b70C6676984',
		},
	},
	EthGas: {
		CreateGasReport: {
			browser: 'Vision',
			referralCode: 'EVUJ13W',
		},
	},
};
