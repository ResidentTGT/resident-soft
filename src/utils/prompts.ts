import readline from 'node:readline/promises';
import { GREEN_TEXT } from '@utils/logger';
import prompts from 'prompts';

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
