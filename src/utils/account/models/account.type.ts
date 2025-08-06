import { BrowserExtension } from './browserExtension.type';
import { Cex } from './cex.type';
import { Proxy } from './proxy.type';
import { SocialAccount } from './socialAccount.type';
import { Wallet } from './wallet.type';

export interface Account {
	name: string;
	browser?: {
		id?: string;
	};
	seeds?: {
		'12'?: string;
		'24'?: string;
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
