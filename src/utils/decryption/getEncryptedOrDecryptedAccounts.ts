import { Account } from '@utils/account';
import { decrypt, encrypt } from './aesEncryption';

export function getEncryptedOrDecryptedAccounts(aesKey: string, accounts: Account[], encryption: boolean): Account[] {
	const func = encryption ? encrypt : decrypt;
	const encryptedAccounts = [];
	for (const account of accounts) {
		try {
			const accountCopy: Account = Object.assign({}, account);

			if (accountCopy.vision) {
				accountCopy.vision = {
					token: accountCopy.vision.token ? func(aesKey, accountCopy.vision.token) : undefined,
					folderId: accountCopy.vision.folderId,
					profileId: accountCopy.vision.profileId,
				};
			}

			if (accountCopy.wallets) {
				if (accountCopy.wallets.evm) {
					accountCopy.wallets.evm = {
						address: accountCopy.wallets.evm.address ? func(aesKey, accountCopy.wallets.evm.address) : undefined,
						private: accountCopy.wallets.evm.private ? func(aesKey, accountCopy.wallets.evm.private) : undefined,
						seed: accountCopy.wallets.evm.seed ? func(aesKey, accountCopy.wallets.evm.seed) : undefined,
					};
				}

				if (accountCopy.wallets.starknet) {
					accountCopy.wallets.starknet = {
						address: accountCopy.wallets.starknet.address
							? func(aesKey, accountCopy.wallets.starknet.address)
							: undefined,
						private: accountCopy.wallets.starknet.private
							? func(aesKey, accountCopy.wallets.starknet.private)
							: undefined,
						seed: accountCopy.wallets.starknet.seed ? func(aesKey, accountCopy.wallets.starknet.seed) : undefined,
					};
				}
				if (accountCopy.wallets.aptos) {
					accountCopy.wallets.aptos = {
						address: accountCopy.wallets.aptos.address ? func(aesKey, accountCopy.wallets.aptos.address) : undefined,
						private: accountCopy.wallets.aptos.private ? func(aesKey, accountCopy.wallets.aptos.private) : undefined,
						seed: accountCopy.wallets.aptos.seed ? func(aesKey, accountCopy.wallets.aptos.seed) : undefined,
					};
				}
				if (accountCopy.wallets.sui) {
					accountCopy.wallets.sui = {
						address: accountCopy.wallets.sui.address ? func(aesKey, accountCopy.wallets.sui.address) : undefined,
						private: accountCopy.wallets.sui.private ? func(aesKey, accountCopy.wallets.sui.private) : undefined,
						seed: accountCopy.wallets.sui.seed ? func(aesKey, accountCopy.wallets.sui.seed) : undefined,
					};
				}
				if (accountCopy.wallets.solana) {
					accountCopy.wallets.solana = {
						address: accountCopy.wallets.solana.address
							? func(aesKey, accountCopy.wallets.solana.address)
							: undefined,
						private: accountCopy.wallets.solana.private
							? func(aesKey, accountCopy.wallets.solana.private)
							: undefined,
						seed: accountCopy.wallets.solana.seed ? func(aesKey, accountCopy.wallets.solana.seed) : undefined,
					};
				}
			}
			if (accountCopy.cexs) {
				if (accountCopy.cexs.okx) {
					accountCopy.cexs.okx = {
						email: accountCopy.cexs.okx.email ? func(aesKey, accountCopy.cexs.okx.email) : undefined,
						evmDepositAddress: accountCopy.cexs.okx.evmDepositAddress
							? func(aesKey, accountCopy.cexs.okx.evmDepositAddress)
							: undefined,
						starknetDepositAddress: accountCopy.cexs.okx.starknetDepositAddress
							? func(aesKey, accountCopy.cexs.okx.starknetDepositAddress)
							: undefined,
						suiDepositAddress: accountCopy.cexs.okx.suiDepositAddress
							? func(aesKey, accountCopy.cexs.okx.suiDepositAddress)
							: undefined,
						aptosDepositAddress: accountCopy.cexs.okx.aptosDepositAddress
							? func(aesKey, accountCopy.cexs.okx.aptosDepositAddress)
							: undefined,
						solanaDepositAddress: accountCopy.cexs.okx.solanaDepositAddress
							? func(aesKey, accountCopy.cexs.okx.solanaDepositAddress)
							: undefined,
						api: {
							apiKey: accountCopy.cexs.okx.api?.apiKey ? func(aesKey, accountCopy.cexs.okx.api.apiKey) : undefined,
							secretKey: accountCopy.cexs.okx.api?.secretKey
								? func(aesKey, accountCopy.cexs.okx.api.secretKey)
								: undefined,
							passPhrase: accountCopy.cexs.okx.api?.passPhrase
								? func(aesKey, accountCopy.cexs.okx.api.passPhrase)
								: undefined,
						},
					};
				}
				if (accountCopy.cexs.bitget) {
					accountCopy.cexs.bitget = {
						email: accountCopy.cexs.bitget.email ? func(aesKey, accountCopy.cexs.bitget.email) : undefined,
						evmDepositAddress: accountCopy.cexs.bitget.evmDepositAddress
							? func(aesKey, accountCopy.cexs.bitget.evmDepositAddress)
							: undefined,
						starknetDepositAddress: accountCopy.cexs.bitget.starknetDepositAddress
							? func(aesKey, accountCopy.cexs.bitget.starknetDepositAddress)
							: undefined,
						suiDepositAddress: accountCopy.cexs.bitget.suiDepositAddress
							? func(aesKey, accountCopy.cexs.bitget.suiDepositAddress)
							: undefined,
						aptosDepositAddress: accountCopy.cexs.bitget.aptosDepositAddress
							? func(aesKey, accountCopy.cexs.bitget.aptosDepositAddress)
							: undefined,
						solanaDepositAddress: accountCopy.cexs.bitget.solanaDepositAddress
							? func(aesKey, accountCopy.cexs.bitget.solanaDepositAddress)
							: undefined,
						api: {
							apiKey: accountCopy.cexs.bitget.api?.apiKey
								? func(aesKey, accountCopy.cexs.bitget.api.apiKey)
								: undefined,
							secretKey: accountCopy.cexs.bitget.api?.secretKey
								? func(aesKey, accountCopy.cexs.bitget.api.secretKey)
								: undefined,
							passPhrase: accountCopy.cexs.bitget.api?.passPhrase
								? func(aesKey, accountCopy.cexs.bitget.api.passPhrase)
								: undefined,
						},
					};
				}
			}
			if (accountCopy.extensions) {
				if (accountCopy.extensions.metamask) {
					accountCopy.extensions.metamask = {
						password: accountCopy.extensions.metamask.password
							? func(aesKey, accountCopy.extensions.metamask.password)
							: undefined,
						baseUrl: accountCopy.extensions.metamask.baseUrl,
					};
				}
				if (accountCopy.extensions.argent) {
					accountCopy.extensions.argent = {
						password: accountCopy.extensions.argent.password
							? func(aesKey, accountCopy.extensions.argent.password)
							: undefined,
						baseUrl: accountCopy.extensions.argent.baseUrl,
					};
				}
				if (accountCopy.extensions.martian) {
					accountCopy.extensions.martian = {
						password: accountCopy.extensions.martian.password
							? func(aesKey, accountCopy.extensions.martian.password)
							: undefined,
						baseUrl: accountCopy.extensions.martian.baseUrl,
					};
				}
				if (accountCopy.extensions.suiWallet) {
					accountCopy.extensions.suiWallet = {
						password: accountCopy.extensions.suiWallet.password
							? func(aesKey, accountCopy.extensions.suiWallet.password)
							: undefined,
						baseUrl: accountCopy.extensions.suiWallet.baseUrl,
					};
				}
				if (accountCopy.extensions.ethosWallet) {
					accountCopy.extensions.ethosWallet = {
						password: accountCopy.extensions.ethosWallet.password
							? func(aesKey, accountCopy.extensions.ethosWallet.password)
							: undefined,
						baseUrl: accountCopy.extensions.ethosWallet.baseUrl,
					};
				}
				if (accountCopy.extensions.petraWallet) {
					accountCopy.extensions.petraWallet = {
						password: accountCopy.extensions.petraWallet.password
							? func(aesKey, accountCopy.extensions.petraWallet.password)
							: undefined,
						baseUrl: accountCopy.extensions.petraWallet.baseUrl,
					};
				}
				if (accountCopy.extensions.zerion) {
					accountCopy.extensions.zerion = {
						password: accountCopy.extensions.zerion.password
							? func(aesKey, accountCopy.extensions.zerion.password)
							: undefined,
						baseUrl: accountCopy.extensions.zerion.baseUrl,
					};
				}
				if (accountCopy.extensions.backpack) {
					accountCopy.extensions.backpack = {
						password: accountCopy.extensions.backpack.password
							? func(aesKey, accountCopy.extensions.backpack.password)
							: undefined,
						baseUrl: accountCopy.extensions.backpack.baseUrl,
					};
				}
				if (accountCopy.extensions.phantom) {
					accountCopy.extensions.phantom = {
						password: accountCopy.extensions.phantom.password
							? func(aesKey, accountCopy.extensions.phantom.password)
							: undefined,
						baseUrl: accountCopy.extensions.phantom.baseUrl,
					};
				}
				if (accountCopy.extensions.rabby) {
					accountCopy.extensions.rabby = {
						password: accountCopy.extensions.rabby.password
							? func(aesKey, accountCopy.extensions.rabby.password)
							: undefined,
						baseUrl: accountCopy.extensions.rabby.baseUrl,
					};
				}
			}
			if (accountCopy.socials) {
				if (accountCopy.socials.mail) {
					accountCopy.socials.mail = {
						login: accountCopy.socials.mail.login ? func(aesKey, accountCopy.socials.mail.login) : undefined,
						password: accountCopy.socials.mail.password ? func(aesKey, accountCopy.socials.mail.password) : undefined,
						mail: accountCopy.socials.mail.mail ? func(aesKey, accountCopy.socials.mail.mail) : undefined,
						phone: accountCopy.socials.mail.phone ? func(aesKey, accountCopy.socials.mail.phone) : undefined,
						recoveryMail: accountCopy.socials.mail.recoveryMail
							? func(aesKey, accountCopy.socials.mail.recoveryMail)
							: undefined,
						recoveryMailPassword: accountCopy.socials.mail.recoveryMailPassword
							? func(aesKey, accountCopy.socials.mail.recoveryMailPassword)
							: undefined,
						_2fa: accountCopy.socials.mail._2fa ? func(aesKey, accountCopy.socials.mail._2fa) : undefined,
					};
				}
				if (accountCopy.socials.twitter) {
					accountCopy.socials.twitter = {
						login: accountCopy.socials.twitter.login ? func(aesKey, accountCopy.socials.twitter.login) : undefined,
						password: accountCopy.socials.twitter.password
							? func(aesKey, accountCopy.socials.twitter.password)
							: undefined,
						phone: accountCopy.socials.twitter.phone ? func(aesKey, accountCopy.socials.twitter.phone) : undefined,
						mail: accountCopy.socials.twitter.mail ? func(aesKey, accountCopy.socials.twitter.mail) : undefined,
						mailPassword: accountCopy.socials.twitter.mailPassword
							? func(aesKey, accountCopy.socials.twitter.mailPassword)
							: undefined,
						token: accountCopy.socials.twitter.token ? func(aesKey, accountCopy.socials.twitter.token) : undefined,
						_2fa: accountCopy.socials.twitter._2fa ? func(aesKey, accountCopy.socials.twitter._2fa) : undefined,
					};
				}
				if (accountCopy.socials.discord) {
					accountCopy.socials.discord = {
						login: accountCopy.socials.discord.login ? func(aesKey, accountCopy.socials.discord.login) : undefined,
						password: accountCopy.socials.discord.password
							? func(aesKey, accountCopy.socials.discord.password)
							: undefined,
						phone: accountCopy.socials.discord.phone ? func(aesKey, accountCopy.socials.discord.phone) : undefined,
						mail: accountCopy.socials.discord.mail ? func(aesKey, accountCopy.socials.discord.mail) : undefined,
						mailPassword: accountCopy.socials.discord.mailPassword
							? func(aesKey, accountCopy.socials.discord.mailPassword)
							: undefined,
						token: accountCopy.socials.discord.token ? func(aesKey, accountCopy.socials.discord.token) : undefined,
						_2fa: accountCopy.socials.discord._2fa ? func(aesKey, accountCopy.socials.discord._2fa) : undefined,
					};
				}
			}
			if (accountCopy.github) {
				accountCopy.github = {
					token: accountCopy.github.token ? func(aesKey, accountCopy.github.token) : undefined,
				};
			}
			if (accountCopy.proxy) {
				accountCopy.proxy = {
					ip: accountCopy.proxy.ip ? func(aesKey, accountCopy.proxy.ip) : undefined,
					port: accountCopy.proxy.port ? func(aesKey, accountCopy.proxy.port.toString()) : undefined,
					login: accountCopy.proxy.login ? func(aesKey, accountCopy.proxy.login) : undefined,
					password: accountCopy.proxy.password ? func(aesKey, accountCopy.proxy.password) : undefined,
					rotateUrl: accountCopy.proxy.rotateUrl ? func(aesKey, accountCopy.proxy.rotateUrl) : undefined,
					type: accountCopy.proxy.type,
				};
			}

			encryptedAccounts.push(accountCopy);
		} catch (e) {
			throw new Error(`Couldnt ${encryption ? 'encrypt' : 'decrypt'} ${account.name}: ${e}`);
		}
	}

	return encryptedAccounts;
}
