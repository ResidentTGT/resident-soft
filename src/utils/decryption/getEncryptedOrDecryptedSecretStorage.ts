import { SecretStorage } from '@utils/secretStorage.type';
import { decrypt, encrypt } from './aesEncryption';

export function getEncryptedOrDecryptedSecretStorage(aesKey: string, storage: SecretStorage, encryption: boolean): SecretStorage {
	const func = encryption ? encrypt : decrypt;
	const newStorage: SecretStorage = Object.assign({}, storage);

	newStorage.mainEvmWallet = {
		address: storage.mainEvmWallet?.address ? func(aesKey, storage.mainEvmWallet.address) : '',
		private: storage.mainEvmWallet?.private ? func(aesKey, storage.mainEvmWallet.private) : '',
		seed: storage.mainEvmWallet?.seed ? func(aesKey, storage.mainEvmWallet.seed) : '',
	};

	newStorage.mainBinanceAccount = {
		email: storage.mainBinanceAccount?.email ? func(aesKey, storage.mainBinanceAccount.email) : '',
		evmDepositAddress: storage.mainBinanceAccount?.evmDepositAddress
			? func(aesKey, storage.mainBinanceAccount.evmDepositAddress)
			: '',
		api: {
			apiKey: storage.mainBinanceAccount?.api?.apiKey ? func(aesKey, storage.mainBinanceAccount.api.apiKey) : '',
			secretKey: storage.mainBinanceAccount?.api?.secretKey ? func(aesKey, storage.mainBinanceAccount.api.secretKey) : '',
			passPhrase: storage.mainBinanceAccount?.api?.passPhrase
				? func(aesKey, storage.mainBinanceAccount.api.passPhrase)
				: '',
		},
	};

	newStorage.mainOkxAccount = {
		email: storage.mainOkxAccount?.email ? func(aesKey, storage.mainOkxAccount.email) : '',
		evmDepositAddress: storage.mainOkxAccount?.evmDepositAddress
			? func(aesKey, storage.mainOkxAccount.evmDepositAddress)
			: '',
		api: {
			apiKey: storage.mainOkxAccount?.api?.apiKey ? func(aesKey, storage.mainOkxAccount.api.apiKey) : '',
			secretKey: storage.mainOkxAccount?.api?.secretKey ? func(aesKey, storage.mainOkxAccount.api.secretKey) : '',
			passPhrase: storage.mainOkxAccount?.api?.passPhrase ? func(aesKey, storage.mainOkxAccount.api.passPhrase) : '',
		},
	};

	newStorage.mainBitgetAccount = {
		email: storage.mainBitgetAccount?.email ? func(aesKey, storage.mainBitgetAccount.email) : '',
		evmDepositAddress: storage.mainBitgetAccount?.evmDepositAddress
			? func(aesKey, storage.mainBitgetAccount.evmDepositAddress)
			: '',
		api: {
			apiKey: storage.mainBitgetAccount?.api?.apiKey ? func(aesKey, storage.mainBitgetAccount.api.apiKey) : '',
			secretKey: storage.mainBitgetAccount?.api?.secretKey ? func(aesKey, storage.mainBitgetAccount.api.secretKey) : '',
			passPhrase: storage.mainBitgetAccount?.api?.passPhrase ? func(aesKey, storage.mainBitgetAccount.api.passPhrase) : '',
		},
	};

	newStorage.mainGateAccount = {
		email: storage.mainGateAccount?.email ? func(aesKey, storage.mainGateAccount.email) : '',
		evmDepositAddress: storage.mainGateAccount?.evmDepositAddress
			? func(aesKey, storage.mainGateAccount.evmDepositAddress)
			: '',
		api: {
			apiKey: storage.mainGateAccount?.api?.apiKey ? func(aesKey, storage.mainGateAccount.api.apiKey) : '',
			secretKey: storage.mainGateAccount?.api?.secretKey ? func(aesKey, storage.mainGateAccount.api.secretKey) : '',
			passPhrase: storage.mainGateAccount?.api?.passPhrase ? func(aesKey, storage.mainGateAccount.api.passPhrase) : '',
		},
	};

	newStorage.cmcApiKey = storage.cmcApiKey ? func(aesKey, storage.cmcApiKey) : '';
	newStorage.rucaptchaApiKey = storage.rucaptchaApiKey ? func(aesKey, storage.rucaptchaApiKey) : '';
	newStorage.capSolverApiKey = storage.capSolverApiKey ? func(aesKey, storage.capSolverApiKey) : '';
	newStorage._2captchaApiKey = storage._2captchaApiKey ? func(aesKey, storage._2captchaApiKey) : '';
	newStorage.etherscanApiKey = storage.etherscanApiKey ? func(aesKey, storage.etherscanApiKey) : '';
	newStorage.polygonscanApiKey = storage.polygonscanApiKey ? func(aesKey, storage.polygonscanApiKey) : '';
	newStorage.lineascanApiKey = storage.lineascanApiKey ? func(aesKey, storage.lineascanApiKey) : '';
	newStorage.arbiscanApiKey = storage.arbiscanApiKey ? func(aesKey, storage.arbiscanApiKey) : '';
	newStorage.basescanApiKey = storage.basescanApiKey ? func(aesKey, storage.basescanApiKey) : '';
	newStorage.scrollscanApiKey = storage.scrollscanApiKey ? func(aesKey, storage.scrollscanApiKey) : '';
	newStorage.berascanApiKey = storage.berascanApiKey ? func(aesKey, storage.berascanApiKey) : '';

	newStorage.telegram = {
		apiKey: storage.telegram?.apiKey ? func(aesKey, storage.telegram.apiKey) : '',
		chatId: storage.telegram?.chatId ? func(aesKey, storage.telegram.chatId) : '',
	};

	newStorage.deepseekApiKey = storage.deepseekApiKey ? func(aesKey, storage.deepseekApiKey) : '';
	newStorage.wssRpcUrl = storage.wssRpcUrl ? func(aesKey, storage.wssRpcUrl) : '';

	return newStorage;
}
