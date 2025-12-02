/**
 * Core action types and interfaces
 */

export interface ActionParams {
	group: ActionsGroupName;
	action: ActionName;
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
	Meteora = 'Meteora',
	Polymarket = 'Polymarket',
	Superchain = 'Superchain',
	Abstract = 'Abstract',
	Afina = 'Afina',
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
	RestorePhantom = 'RestorePhantom',
	GetProfiles = 'GetProfiles',
	LoginInMetamask = 'LoginInMetamask',
	LoginInRabby = 'LoginInRabby',
	RestoreRabby = 'RestoreRabby',
	SellCollectionByLink = 'SellCollectionByLink',
	Linea = 'Linea',
	ParseIsotopes = 'ParseIsotopes',
	Spin = 'Spin',
	AddLiquidity = 'AddLiquidity',
	MakeTransactions = 'MakeTransactions',
	Vote = 'Vote',
	Post = 'Post',
	Quote = 'Quote',
}
