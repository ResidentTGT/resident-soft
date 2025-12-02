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
		RefuelGasZip: {
			fromChainId: ChainId.Ethereum,
			amount: [0, 0],
			minBalanceToKeep: [0, 0],
			minAmountToSend: 0,
			toChainIds: [ChainId.Ethereum],
		},
		RefuelManyGasZip: {
			fromChainId: ChainId.Ethereum,
			amount: [0, 0],
			toChainIds: [ChainId.Ethereum],
			addresses: [],
		},
		RefuelRelayLink: {
			amount: [0, 0],
			minBalanceToKeep: [0, 0],
			minAmountToSend: 0,
			fromChainId: ChainId.Ethereum,
			toChainId: ChainId.Ethereum,
		},
		RefuelManyRelayLink: {
			amount: [0, 0],
			fromChainId: ChainId.Ethereum,
			toChainId: ChainId.Ethereum,
			addresses: [],
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
	},
	Odos: {
		Swap: {
			chainId: ChainId.Ethereum,
			token1: 'ETH',
			token2: 'USDC',
			amount: [0, 0],
			slippageInPercent: 0,
			minAmountForSwap: 0,
		},
	},
	Exchanges: {
		Withdraw: {
			exchanges: [],
			amount: [0, 0],
			token: '',
			to: '',
			toChainId: '',
		},
	},
	Okx: {
		Withdraw: {
			amount: [0, 0],
			token: '',
			to: '',
			toChainId: ChainId.Ethereum,
		},
	},
	Bitget: {
		Withdraw: {
			amount: [0, 0],
			token: '',
			to: '',
			toChainId: ChainId.Ethereum,
		},
	},
	Gate: {
		Withdraw: {
			amount: [0, 0],
			token: '',
			to: '',
			toChainId: ChainId.Ethereum,
		},
	},
	Binance: {
		Withdraw: {
			amount: [0, 0],
			token: '',
			to: '',
			toChainId: ChainId.Ethereum,
		},
	},
	Bybit: {
		Withdraw: {
			amount: [0, 0],
			token: '',
			to: '',
			toChainId: ChainId.Ethereum,
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
		},
	},
	Afina: {
		GetProfiles: {
			apiKey: '',
		},
	},
};
