import readline from 'node:readline/promises';
import { readFileSync } from 'fs';
import { LaunchParams } from '@utils/types/launchParams.type';
import { getAllAccounts } from '@utils/getAllAccounts';
import { getEncryptedOrDecryptedAccounts, getEncryptedOrDecryptedSecretStorage } from '@utils/decryption';
import { filterAccounts } from '@utils/filterAccounts';
import { SecretStorage } from '@utils/secretStorage.type';
import { actionMode } from '@utils/actionMode';
import { convertFromCsvToCsv, convertSecretStorage } from '@utils/workWithSecrets';
import { parse } from 'jsonc-parser';
import { GREEN_TEXT, Logger } from '@utils/logger';
import prompts, { PromptObject } from 'prompts';

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
		const filteredAccs = await filterAccounts(allAccounts, this.launchParams);
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

export async function promptUserForOption(launchParams: LaunchParams): Promise<CommandOption | undefined> {
	const runAction =
		launchParams.ACTION_PARAMS.group && launchParams.ACTION_PARAMS.action
			? `🚀 ${launchParams.ACTION_PARAMS.group} -> ${launchParams.ACTION_PARAMS.action}`
			: 'No action selected. Check launchParams.jsonc';
	const q: PromptObject = {
		type: 'select',
		name: 'choice',
		message: 'Select option:',
		choices: [
			{ title: `${runAction}`, value: 'run' },
			{ title: '🔑 Encrypt accounts and secretStorage', value: 'encrypt' },
			{ title: '🔓 Decrypt accounts and secretStorage', value: 'decrypt' },
			{ title: '❌ Exit', value: 'exit' },
		],
		hint: 'arrows ↑↓, Enter — select',
	};

	const { choice } = await prompts(q, {
		onCancel: () => {
			console.log('\nCancel.');
			process.exit(0);
		},
	});

	switch (choice) {
		case 'run':
			return CommandOption['Action Mode'];
		case 'encrypt':
			return CommandOption['Encrypt Accounts And SecretStorage'];
		case 'decrypt':
			return CommandOption['Decrypt Accounts And SecretStorage'];
		default:
			return;
	}
}

export async function promptUserForKey(decryption: boolean): Promise<string> {
	if (decryption) {
		const response = await prompts({
			type: 'password',
			name: 'key',
			message: GREEN_TEXT + 'Enter the key for decryption:',
			mask: '*',
		});
		if (!response.key) throw new Error('Key for decryption is required!');

		return response.key;
	} else {
		const response = await prompts({
			type: 'password',
			name: 'key',
			message: GREEN_TEXT + 'Enter the key for encryption:',
			mask: '*',
		});
		if (!response.key) throw new Error('Key for encryption is required!');
		const response2 = await prompts({
			type: 'password',
			name: 'key',
			message: GREEN_TEXT + 'Repeat the key for encryption:',
			mask: '*',
		});
		if (!response2.key) throw new Error('Key for encryption is required!');
		if (response.key !== response2.key) throw new Error('Keys are not equal!');
		return response.key;
	}
}

export async function waitForKeyPress(message = 'Press ENTER to exit ...'): Promise<void> {
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
