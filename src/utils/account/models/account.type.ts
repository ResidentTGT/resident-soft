import { type BrowserExtension } from './browserExtension.type';
import { type Cex } from './cex.type';
import { type Proxy } from './proxy.type';
import { type SocialAccount } from './socialAccount.type';
import { type Wallet } from './wallet.type';

export interface Account {
	name: string;
	adsPower?: {
		profileId?: string;
	};
	vision?: {
		token?: string;
		folderId?: string;
		profileId?: string;
	};
	afina?: {
		apiKey?: string;
		profileId?: string;
	};
	wallets?: {
		evm?: Wallet;
		starknet?: Wallet;
		aptos?: Wallet;
		sui?: Wallet;
		solana?: Wallet;
	};
	cexs?: {
		okx?: Cex;
		binance?: Cex;
		bitget?: Cex;
	};
	extensions?: {
		metamask?: BrowserExtension;
		martian?: BrowserExtension;
		argent?: BrowserExtension;
		suiWallet?: BrowserExtension;
		ethosWallet?: BrowserExtension;
		petraWallet?: BrowserExtension;
		zerion?: BrowserExtension;
		backpack?: BrowserExtension;
		phantom?: BrowserExtension;
		rabby?: BrowserExtension;
	};
	socials?: {
		twitter?: SocialAccount;
		discord?: SocialAccount;
		mail?: SocialAccount;
	};
	github?: {
		token?: string;
	};
	proxy?: Proxy;
	extdata?: any;
}
