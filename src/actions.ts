export interface ActionParams {
	group: ActionsGroupName;
	action: ActionName;
}

export enum ActionsGroupName {
	Common = 'Common',
	CommonUi = 'CommonUi',
	Evm = 'Evm',
	Svm = 'Svm',
	Towns = 'Towns',
	Twitter = 'Twitter',
	Eclipse = 'Eclipse',
	Okx = 'Okx',
	Bitget = 'Bitget',
	Binance = 'Binance',
	Gate = 'Gate',
	Odos = 'Odos',
	Berachain = 'Berachain',
	Opensea = 'Opensea',
	TEST = 'TEST',
	TEST_PREMIUM = 'TEST_PREMIUM',
	Hemi = 'Hemi',
	Shape = 'Shape',
	Plasma = 'Plasma',
	ZksyncLite = 'ZksyncLite',
	Sophon = 'Sophon',
	Checkers = 'Checkers',
	Bybit = 'Bybit',
	Exchanges = 'Exchanges',
	AdsPower = 'AdsPower',
	Vision = 'Vision',
}

export enum ActionName {
	CheckBalances = 'CheckBalances',
	CheckTransactions = 'CheckTransactions',
	RegisterUi = 'RegisterUi',
	Claim = 'Claim',
	ClaimUi = 'ClaimUi',
	Bober = 'Bober',
	OpenPages = 'OpenPages',
	Follow = 'Follow',
	Tap = 'Tap',
	Review = 'Review',
	JoinTown = 'JoinTown',
	RandomActionInRandomChannelInNativeTown = 'RandomActionInRandomChannelInNativeTown',
	RandomActionInRandomChannelInRandomTown = 'RandomActionInRandomChannelInRandomTown',
	SendToken = 'SendToken',
	LikeAndRetweet = 'LikeAndRetweet',
	Login = 'Login',
	ChangeName = 'ChangeName',
	Withdraw = 'Withdraw',
	CheckNft = 'CheckNft',
	Swap = 'Swap',
	HoneypotSwap = 'HoneypotSwap',
	HoneyfunCreateMeme = 'HoneyfunCreateMeme',
	HoneyfunSellAllMemes = 'HoneyfunSellAllMemes',
	EtherfiConfirmNetwork = 'EtherfiConfirmNetwork',
	OpenseaBuyByLink = 'OpenseaBuyByLink',
	Register = 'Register',
	LombardDepositBase = 'LombardDepositBase',
	LombardDepositSonic = 'LombardDepositSonic',
	Wrap = 'Wrap',
	Unwrap = 'Unwrap',
	CheckStats = 'CheckStats',
	DapDap = 'DapDap',
	KodiakSwap = 'KodiakSwap',
	TEST = 'TEST',
	ShowWallets = 'ShowWallets',
	RefuelManyGasZip = 'RefuelManyGasZip',
	RefuelManyRelayLink = 'RefuelManyRelayLink',
	Approve = 'Approve',
	WithdrawFlow = 'WithdrawFlow',
	Outpostsurge = 'Outpostsurge',
	JunkyUrsas = 'JunkyUrsas',
	CrosschainMint = 'CrosschainMint',
	Yeet = 'Yeet',
	YeetGetTodayValues = 'YeetGetTodayValues',
	Reply = 'Reply',
	RefuelGasZip = 'RefuelGasZip',
	RefuelRelayLink = 'RefuelRelayLink',
	SweepByLink = 'SweepByLink',
	MintStack = 'MintStack',
	MintForms = 'MintForms',
	ConnectTwitter = 'ConnectTwitter',
	ConnectDiscord = 'ConnectDiscord',
	RestoreMetamask = 'RestoreMetamask',
	RestorePetra = 'RestorePetra',
	OtomMint = 'OtomMint',
	OtomAnnihilate = 'OtomAnnihilate',
	OtomAnalyze = 'OtomAnalyze',
	OtomMineAllOtoms = 'OtomMineAllOtoms',
	OtomMineAllIsotopes = 'OtomMineAllIsotopes',
	OtomMineOtom = 'OtomMineOtom',
	OtomMineAndAnnihilateMolecule = 'OtomMineAndAnnihilateMolecule',
	Mint = 'Mint',
	OtomMineMolecule = 'OtomMineMolecule',
	GetProfileInfo = 'GetProfileInfo',
	OnetLogin = 'OnetLogin',
	LoginByToken = 'LoginByToken',
	OutlookLogin = 'OutlookLogin',
	OtomCraftPkax = 'OtomCraftPkax',
	ClaimBgtAndRedeemAndSendToOkx = 'ClaimBgtAndRedeemAndSendToOkx',
	FlyTradeSwap = 'FlyTradeSwap',
	MakeTransaction = 'MakeTransaction',
	Deposit = 'Deposit',
	GenerateWallets = 'GenerateWallets',
	RestoreBackpack = 'RestoreBackpack',
	RestoreArgent = 'RestoreArgent',
	GetProfiles = 'GetProfiles',
	LoginInMetamask = 'LoginInMetamask',
	LoginInRabby = 'LoginInRabby',
	RestoreRabby = 'RestoreRabby',
	SellCollectionByLink = 'SellCollectionByLink',
	Linea = 'Linea',
	ParseIsotopes = 'ParseIsotopes',
}

export interface Action {
	action: ActionName;
	isolated: boolean;
	name: string;
	allowed: boolean;
}

export interface ActionsGroup {
	group: ActionsGroupName;
	premium: boolean;
	actions: Action[];
	name: string;
	allowed: boolean;
}

export const ACTIONS: ActionsGroup[] = [
	{
		group: ActionsGroupName.Common,
		premium: false,
		name: 'Общие',
		allowed: true,
		actions: [
			{ action: ActionName.CheckBalances, isolated: false, allowed: true, name: 'Проверить балансы' },
			{
				action: ActionName.GenerateWallets,
				isolated: false,

				allowed: true,
				name: 'Сгенерировать EVM кошельки',
			},
			{ action: ActionName.RefuelGasZip, isolated: true, allowed: true, name: 'Refuel через GasZip' },
			{
				action: ActionName.RefuelRelayLink,
				isolated: true,

				allowed: true,
				name: 'Refuel через RelayLink',
			},
			{
				action: ActionName.RefuelManyGasZip,
				isolated: false,

				allowed: true,
				name: 'Refuel с одного кошелька на множество других через GasZip',
			},
			{
				action: ActionName.RefuelManyRelayLink,
				isolated: false,

				allowed: true,
				name: 'Refuel с одного кошелька на множество других через RelayLink',
			},
		],
	},
	{
		group: ActionsGroupName.Evm,
		premium: false,
		name: 'EVM',
		allowed: true,
		actions: [
			{ action: ActionName.SendToken, isolated: true, allowed: true, name: 'Отправка токенов' },
			{
				action: ActionName.CheckNft,
				isolated: false,

				allowed: true,
				name: 'Проверить наличие NFT ERC-721',
			},
			{
				action: ActionName.CheckTransactions,
				isolated: true,

				allowed: false,
				name: 'Проверить транзакции',
			},
			{ action: ActionName.Wrap, isolated: true, allowed: true, name: 'Wrap' },
			{ action: ActionName.Unwrap, isolated: true, allowed: true, name: 'Unwrap' },
			{ action: ActionName.Approve, isolated: true, allowed: true, name: 'Approve' },
			{
				action: ActionName.MakeTransaction,
				isolated: true,

				allowed: true,
				name: 'Сделать кастомную транзакцию',
			},
		],
	},
	{
		group: ActionsGroupName.Svm,
		premium: false,
		name: 'SVM',
		allowed: true,
		actions: [{ action: ActionName.SendToken, isolated: true, allowed: true, name: 'Отправка токенов' }],
	},
	{
		group: ActionsGroupName.Twitter,
		premium: false,
		name: 'Twitter',
		allowed: false,
		actions: [
			{ action: ActionName.Follow, isolated: true, allowed: true, name: '' },
			{ action: ActionName.LikeAndRetweet, isolated: true, allowed: true, name: '' },
			{ action: ActionName.Login, isolated: true, allowed: true, name: '' },
			{ action: ActionName.LoginByToken, isolated: true, allowed: true, name: '' },
			{ action: ActionName.OnetLogin, isolated: true, allowed: true, name: '' },
			{ action: ActionName.OutlookLogin, isolated: true, allowed: true, name: '' },
			{ action: ActionName.ChangeName, isolated: true, allowed: true, name: '' },
			{ action: ActionName.GetProfileInfo, isolated: true, allowed: true, name: '' },
			{ action: ActionName.Reply, isolated: true, allowed: true, name: '' },
		],
	},
	{
		group: ActionsGroupName.Okx,
		premium: false,
		name: 'OKX',
		allowed: true,
		actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
	},
	{
		group: ActionsGroupName.Bitget,
		premium: false,
		name: 'Bitget',
		allowed: true,
		actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
	},
	{
		group: ActionsGroupName.Binance,
		premium: false,
		name: 'Binance',
		allowed: true,
		actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
	},
	{
		group: ActionsGroupName.Gate,
		premium: false,
		name: 'Gate',
		allowed: true,
		actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
	},
	{
		group: ActionsGroupName.Bybit,
		premium: false,
		name: 'Bybit',
		allowed: true,
		actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
	},
	{
		group: ActionsGroupName.Odos,
		premium: false,
		name: 'Odos',
		allowed: true,
		actions: [{ action: ActionName.Swap, isolated: true, allowed: true, name: 'Swap' }],
	},
	{
		group: ActionsGroupName.TEST,
		premium: false,
		name: 'TEST',
		allowed: false,
		actions: [{ action: ActionName.TEST, isolated: true, allowed: true, name: '' }],
	},
	{
		group: ActionsGroupName.ZksyncLite,
		premium: true,
		name: 'Zksync Lite',
		allowed: true,
		actions: [{ action: ActionName.SendToken, isolated: true, allowed: true, name: 'Отправка токенов через UI' }],
	},
	{
		group: ActionsGroupName.TEST_PREMIUM,
		premium: true,
		name: 'TEST_PREMIUM',
		allowed: false,
		actions: [{ action: ActionName.TEST, isolated: true, allowed: true, name: '' }],
	},
	{
		group: ActionsGroupName.CommonUi,
		premium: true,
		name: 'Общие UI',
		allowed: true,
		actions: [
			{
				action: ActionName.OpenPages,
				isolated: true,

				allowed: true,
				name: 'Открыть страницы в браузере',
			},
			{
				action: ActionName.LoginInMetamask,
				isolated: true,

				allowed: true,
				name: 'Логин в расширении Metamask',
			},
			{
				action: ActionName.RestoreMetamask,
				isolated: true,

				allowed: true,
				name: 'Восстановление расширения Metamask',
			},
			{
				action: ActionName.RestorePetra,
				isolated: true,

				allowed: true,
				name: 'Восстановление расширения Petra',
			},
			{
				action: ActionName.RestoreBackpack,
				isolated: true,

				allowed: true,
				name: 'Восстановление расширения Backpack',
			},
			{
				action: ActionName.RestoreArgent,
				isolated: true,

				allowed: false,
				name: 'Восстановление расширения Argent',
			},
			{
				action: ActionName.LoginInRabby,
				isolated: true,

				allowed: true,
				name: 'Логин в расширении Rabby',
			},
			{
				action: ActionName.RestoreRabby,
				isolated: true,

				allowed: true,
				name: 'Восстановление расширения Rabby',
			},
		],
	},
	{
		group: ActionsGroupName.Towns,
		premium: true,
		name: 'Towns',
		allowed: false,
		actions: [
			{ action: ActionName.Bober, isolated: true, allowed: true, name: '' },
			{ action: ActionName.JoinTown, isolated: true, allowed: true, name: '' },
			{
				action: ActionName.RandomActionInRandomChannelInNativeTown,
				isolated: true,

				allowed: true,
				name: '',
			},
			{
				action: ActionName.RandomActionInRandomChannelInRandomTown,
				isolated: true,

				allowed: true,
				name: '',
			},
			{ action: ActionName.Review, isolated: true, allowed: true, name: '' },
		],
	},
	{
		group: ActionsGroupName.Eclipse,
		premium: true,
		name: 'Eclipse',
		allowed: false,
		actions: [
			{ action: ActionName.Tap, isolated: true, allowed: true, name: '' },
			{ action: ActionName.Withdraw, isolated: true, allowed: true, name: '' },
		],
	},
	{
		group: ActionsGroupName.Berachain,
		premium: true,
		name: 'Berachain',
		allowed: false,
		actions: [
			{ action: ActionName.HoneypotSwap, isolated: true, allowed: true, name: '' },
			{ action: ActionName.HoneyfunCreateMeme, isolated: true, allowed: true, name: '' },
			{ action: ActionName.HoneyfunSellAllMemes, isolated: true, allowed: true, name: '' },
			{ action: ActionName.DapDap, isolated: true, allowed: true, name: '' },
			{ action: ActionName.KodiakSwap, isolated: true, allowed: true, name: '' },
			{ action: ActionName.JunkyUrsas, isolated: true, allowed: true, name: '' },
			{ action: ActionName.ClaimBgtAndRedeemAndSendToOkx, isolated: true, allowed: true, name: '' },
			{ action: ActionName.FlyTradeSwap, isolated: true, allowed: true, name: '' },
			{ action: ActionName.CheckStats, isolated: true, allowed: true, name: '' },
			{ action: ActionName.Outpostsurge, isolated: true, allowed: true, name: '' },
			{ action: ActionName.Yeet, isolated: true, allowed: true, name: '' },
			{ action: ActionName.YeetGetTodayValues, isolated: true, allowed: true, name: '' },
		],
	},
	{
		group: ActionsGroupName.Opensea,
		premium: true,
		name: 'Opensea',
		allowed: true,
		actions: [
			{
				action: ActionName.OpenseaBuyByLink,
				isolated: true,

				allowed: false,
				name: 'Покупка 1 NFT по ссылке',
			},
			{ action: ActionName.ClaimUi, isolated: true, allowed: true, name: 'Клейм XP в квестах' },
			{
				action: ActionName.SweepByLink,
				isolated: true,

				allowed: true,
				name: 'Sweep коллекции по флору',
			},
			{
				action: ActionName.SellCollectionByLink,
				isolated: true,

				allowed: true,
				name: 'Продать все NFT из коллекции',
			},
			{ action: ActionName.Register, isolated: true, allowed: false, name: '' },
			{ action: ActionName.CrosschainMint, isolated: true, allowed: false, name: '' },
			{ action: ActionName.Mint, isolated: true, allowed: false, name: '' },
		],
	},
	{
		group: ActionsGroupName.Shape,
		premium: true,
		name: 'Shape',
		allowed: true,
		actions: [
			{ action: ActionName.MintStack, isolated: true, allowed: false, name: '' },
			{ action: ActionName.MintForms, isolated: true, allowed: false, name: '' },
			{ action: ActionName.Claim, isolated: true, allowed: false, name: '' },
			{ action: ActionName.ConnectTwitter, isolated: true, allowed: false, name: '' },
			{ action: ActionName.ConnectDiscord, isolated: true, allowed: false, name: '' },
			{ action: ActionName.CheckStats, isolated: true, allowed: false, name: '' },
			{ action: ActionName.OtomMint, isolated: true, allowed: false, name: '' },
			{ action: ActionName.OtomAnnihilate, isolated: true, allowed: false, name: '' },
			{ action: ActionName.OtomAnalyze, isolated: true, allowed: false, name: '' },
			{ action: ActionName.OtomMineAllOtoms, isolated: true, allowed: false, name: '' },
			{ action: ActionName.OtomMineMolecule, isolated: true, allowed: false, name: '' },
			{ action: ActionName.OtomMineOtom, isolated: true, allowed: false, name: '' },
			{ action: ActionName.OtomMineAndAnnihilateMolecule, isolated: true, allowed: false, name: '' },
			{ action: ActionName.OtomCraftPkax, isolated: true, allowed: false, name: '' },
			{ action: ActionName.ParseIsotopes, isolated: false, allowed: true, name: 'Спарсить все изотопы' },
			{ action: ActionName.OtomMineAllIsotopes, isolated: true, allowed: true, name: 'Минтить все изотопы' },
		],
	},
	{
		group: ActionsGroupName.Hemi,
		premium: true,
		name: 'Hemi',
		allowed: false,
		actions: [{ action: ActionName.CheckStats, isolated: false, allowed: true, name: '' }],
	},
	{
		group: ActionsGroupName.Plasma,
		premium: true,
		name: 'Plasma',
		allowed: false,
		actions: [{ action: ActionName.Deposit, isolated: true, allowed: true, name: '' }],
	},
	{
		group: ActionsGroupName.Sophon,
		premium: true,
		name: 'Sophon',
		allowed: true,
		actions: [{ action: ActionName.Claim, isolated: true, allowed: true, name: 'Клейм наград за делегаторство' }],
	},
	{
		group: ActionsGroupName.Checkers,
		premium: false,
		name: 'Чекеры и клеймы',
		allowed: false,
		actions: [
			{ action: ActionName.Linea, isolated: false, allowed: true, name: '' },
			{ action: ActionName.Claim, isolated: true, allowed: true, name: '' },
		],
	},
	{
		group: ActionsGroupName.Exchanges,
		premium: false,
		name: 'Биржи',
		allowed: true,
		actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод' }],
	},
	{
		group: ActionsGroupName.AdsPower,
		premium: true,
		name: 'AdsPower',
		allowed: true,
		actions: [{ action: ActionName.GetProfiles, isolated: false, allowed: true, name: 'Получение профилей' }],
	},
	{
		group: ActionsGroupName.Vision,
		premium: true,
		name: 'Vision',
		allowed: true,
		actions: [{ action: ActionName.GetProfiles, isolated: false, allowed: true, name: 'Получение профилей' }],
	},
];
