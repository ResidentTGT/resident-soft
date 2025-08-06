import readline from 'node:readline/promises';
import { readFileSync } from 'fs';
import { LaunchParams } from '@utils/launchParams.type';
import { getAllAccounts } from '@utils/getAllAccounts';
import { getEncryptedOrDecryptedAccounts, getEncryptedOrDecryptedSecretStorage } from '@utils/decryption';
import { filterAccounts } from '@utils/filterAccounts';
import { SecretStorage } from '@utils/secretStorage.type';
import { actionMode } from '@utils/actionMode';
import { convertFromCsvToCsv, convertSecretStorage } from '@utils/workWithSecrets';
import { parse } from 'jsonc-parser';
import { Logger } from '@utils/logger';

export enum CommandOption {
	'Action Mode' = 1,
	'Decrypt Accounts And SecretStorage' = 2,
	'Encrypt Accounts And SecretStorage' = 3,
}

export class CommandHandler {
	constructor(
		private readonly launchParams: LaunchParams,
		private readonly functionParams: any,
		private readonly aesKey?: string,
	) {}

	async handleActionMode(): Promise<void> {
		const secretStorage = parse(
			readFileSync(
				this.aesKey
					? this.launchParams.ENCRYPTION.SECRET_STORAGE_ENCRYPTED_PATH
					: this.launchParams.ENCRYPTION.SECRET_STORAGE_DECRYPTED_PATH,
				'utf-8',
			),
		) as SecretStorage;
		const decryptedSecretStorage = this.aesKey
			? getEncryptedOrDecryptedSecretStorage(this.aesKey, secretStorage, false)
			: secretStorage;
		Logger.getInstance(decryptedSecretStorage.telegram);

		const allAccounts = await getAllAccounts(
			this.aesKey
				? this.launchParams.ENCRYPTION.ACCOUNTS_ENCRYPTED_PATH
				: this.launchParams.ENCRYPTION.ACCOUNTS_DECRYPTED_PATH,
			this.launchParams.JOB_ACCOUNTS.map((a) => a.file),
		);
		const filteredAccs = filterAccounts(allAccounts, this.launchParams);
		const accounts = this.aesKey ? getEncryptedOrDecryptedAccounts(this.aesKey, filteredAccs, false) : filteredAccs;

		await actionMode(accounts, decryptedSecretStorage, this.launchParams, this.functionParams, this.aesKey);
	}

	async handleAccountsEncryption(encrypt: boolean): Promise<void> {
		if (!this.aesKey) throw new Error('Key for ecnryption/decryption is required!');
		const encryptedFilePath = `${this.launchParams.ENCRYPTION.ACCOUNTS_ENCRYPTED_PATH}`;
		const decryptedFilePath = `${this.launchParams.ENCRYPTION.ACCOUNTS_DECRYPTED_PATH}`;

		await convertFromCsvToCsv(encryptedFilePath, decryptedFilePath, this.aesKey, encrypt);
	}

	async handleSecretStorageEncryption(encrypt: boolean): Promise<void> {
		if (!this.aesKey) throw new Error('Key for ecnryption/decryption is required!');
		const encryptedFilePath = this.launchParams.ENCRYPTION.SECRET_STORAGE_ENCRYPTED_PATH;
		const decryptedFilePath = this.launchParams.ENCRYPTION.SECRET_STORAGE_DECRYPTED_PATH;

		await convertSecretStorage(encryptedFilePath, decryptedFilePath, this.aesKey, encrypt);
	}

	async executeCommand(option: CommandOption): Promise<void> {
		switch (option) {
			case CommandOption['Action Mode']:
				await this.handleActionMode();
				break;
			case CommandOption['Decrypt Accounts And SecretStorage']:
				await this.handleAccountsEncryption(false);
				await this.handleSecretStorageEncryption(false);
				break;
			case CommandOption['Encrypt Accounts And SecretStorage']:
				await this.handleAccountsEncryption(true);
				await this.handleSecretStorageEncryption(true);
				break;
			default:
				throw new Error(`Unsupported option: ${option}`);
		}
	}
}

export async function promptUserForOption(): Promise<CommandOption> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const options = Object.entries(CommandOption)
			.filter(([key]) => isNaN(Number(key)))
			.map(([name, value]) => ({ name, value }));

		for (const { name, value } of options) {
			console.log(`\u001b[0;32m${value}: ${name}\u001b[0m`);
		}

		const answer = await rl.question('\u001b[0;32mPlease choose an option: \u001b[0m');
		const selectedOption = Number(answer) as CommandOption;

		if (!Object.values(CommandOption).includes(selectedOption)) {
			throw new Error(`Invalid option: ${answer}`);
		}

		return selectedOption;
	} finally {
		rl.close();
	}
}

export async function promptUserForKey(): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const answer = await rl.question('\u001b[0;32mEnter the key for encryption/decryption: \u001b[0m');
		return answer;
	} finally {
		rl.close();
	}
}

export async function waitForKeyPress(message = 'Press any key to exit...'): Promise<void> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		await rl.question(message);
	} finally {
		rl.close();
	}
}
