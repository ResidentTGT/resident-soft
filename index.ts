import './src/extensions/array';

import { readFileSync } from 'fs';
import { CommandHandler, CommandOption, promptUserForKey, promptUserForOption, waitForKeyPress } from '@utils/commandHandler';
import { LaunchParams } from '@utils/launchParams.type';
import { parse } from 'jsonc-parser';
import { getVerifyLicenseMessage, welcomeMessage } from '@src/utils/welcome';
import { sendTelemetry } from '@src/utils/telemetry';
import { GREEN_TEXT, RED_BOLD_TEXT, RESET } from '@src/utils/logger';

process.on('unhandledRejection', async (error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\u001b[1;31mUnhandled exception occurred: ${message}\u001b[0m`);
});

async function main() {
	await welcomeMessage();
	const launchParams = parse(readFileSync('./launchParams.jsonc', 'utf-8')) as LaunchParams;
	const functionParams = parse(readFileSync('./functionParams.jsonc', 'utf-8'));

	const licenseResult = await getVerifyLicenseMessage(launchParams);
	await sendTelemetry(licenseResult);

	while (true) {
		try {
			const selectedOption = await promptUserForOption(launchParams);
			if (!selectedOption) process.exit(0);
			console.log(`${GREEN_TEXT}${CommandOption[selectedOption]} started.${RESET}`);

			let key;
			if (
				(selectedOption === CommandOption['Action Mode'] && launchParams.USE_ENCRYPTION) ||
				selectedOption === CommandOption['Decrypt Accounts And SecretStorage']
			)
				key = await promptUserForKey(true);
			else if (selectedOption === CommandOption['Encrypt Accounts And SecretStorage']) key = await promptUserForKey(false);

			const commandHandler = new CommandHandler(launchParams, functionParams, key);
			await commandHandler.executeCommand(selectedOption);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`${RED_BOLD_TEXT}Fatal error. ${message}${RESET}`);
			if (!message.includes('Couldnt decrypt')) {
				await waitForKeyPress();
				process.exit(1);
			}
		}
	}
}

main().catch(console.error);
