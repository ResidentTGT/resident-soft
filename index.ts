import './src/extensions/array';

import { readFileSync } from 'fs';
import { CommandHandler, CommandOption, promptUserForKey, promptUserForOption, waitForKeyPress } from '@utils/commandHandler';
import { LaunchParams } from '@utils/launchParams.type';
import { parse } from 'jsonc-parser';
import { welcome } from '@src/utils/welcome';
import { sendTelemetry } from '@src/utils/telemetry';

process.on('unhandledRejection', async (error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\u001b[1;31mUnhandled exception occurred: ${message}\u001b[0m`);
});

async function main() {
	try {
		const launchParams = parse(readFileSync('./launchParams.jsonc', 'utf-8')) as LaunchParams;
		const functionParams = parse(readFileSync('./functionParams.jsonc', 'utf-8'));

		const licenseResult = await welcome(launchParams);
		await sendTelemetry(licenseResult);
		// if (licenseResult.ok && licenseResult.payload.password && existsSync('premium.zip'))
		// 	await decryptPremium(licenseResult.payload.password);

		const selectedOption = await promptUserForOption();
		console.log(`\u001b[0;35m${CommandOption[selectedOption]} started.\u001b[0m`);

		let key;
		if (
			(selectedOption === CommandOption['Action Mode'] && launchParams.USE_ENCRYPTION) ||
			selectedOption === CommandOption['Decrypt Accounts And SecretStorage'] ||
			selectedOption === CommandOption['Encrypt Accounts And SecretStorage']
		) {
			key = await promptUserForKey();
			if (!key) throw new Error('Key for ecnryption/decryption is required!');
		}

		const commandHandler = new CommandHandler(launchParams, functionParams, key);
		await commandHandler.executeCommand(selectedOption);
		await waitForKeyPress();
		process.exit(0);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`\u001b[1;31mFatal error. ${message}\u001b[0m`);
		await waitForKeyPress();
		process.exit(1);
	}
}

main().catch(console.error);
