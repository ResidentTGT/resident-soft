import { ethers } from 'ethers';
import { ChainId, Network } from '@utils/network';
import { Logger, MessageType } from '@utils/logger';
import Excel from 'exceljs';
//import { Keypair } from '@solana/web3.js';
//const bip39 = require('bip39');

export async function generateWallets(amount: number, chainId = ChainId.Ethereum) {
	if (Network.isEvm(chainId)) {
		const wallets = [...Array(amount)].map((a) => {
			const wallet = ethers.Wallet.createRandom();
			return Object.assign({ phrase: wallet.mnemonic?.phrase, privateKey: wallet.privateKey }, wallet);
		});

		const workbook = new Excel.Workbook();
		const worksheet = workbook.addWorksheet('Wallets');
		worksheet.columns = [
			{ header: 'EVM seed', key: 'phrase', width: 15 },
			{ header: 'EVM private', key: 'privateKey', width: 15 },
			{ header: 'EVM addr', key: 'address', width: 15 },
		];

		wallets.forEach((p) => worksheet.addRow(p));

		worksheet.getRow(1).font = { bold: true };

		const path = 'states/newEvmWallets.xlsx';
		await workbook.xlsx.writeFile(path);

		await Logger.getInstance().log(`${amount} EVM wallets generated and saved to ${path}`, MessageType.Info);
	} else if (chainId === ChainId.Solana) {
		// for (let i = 0; i < amount; i++) {
		// 	const wallet = ethers.Wallet.createRandom();
		// 	const seedPhrase = wallet.mnemonic?.phrase;
		// 	if (!seedPhrase) throw new Error();
		// 	const seed = bip39.mnemonicToSeedSync(seedPhrase).slice(0, 32);
		// 	const keypair = Keypair.fromSeed(seed);
		// 	const privateKey = keypair.secretKey.toString().slice(0, 32);
		// 	const address = keypair.publicKey.toJSON();
		// 	await Logger.getInstance().log(`${i + 1};${address};${seedPhrase};${privateKey}`, MessageType.Trace, true);
		// }
	}
}
