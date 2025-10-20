import { CommandHandler, CommandOption, promptUserForKey, promptUserForOption, waitForKeyPress } from '@utils/commandHandler';
import { getVerifyLicenseMessage, welcomeMessage } from '@src/utils/welcome';
import { sendTelemetry } from '@src/utils/telemetry';
import { GREEN_TEXT, RED_BOLD_TEXT, RESET } from '@src/utils/logger';
import { readConfigs } from '@src/utils/config-io';
import { startHttpServer } from '@src/utils/server';
import { selectionGate } from '@src/utils/selection';
import { Network } from '@src/utils/network';

process.on('unhandledRejection', async (error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\u001b[1;31mUnhandled exception occurred: ${message}\u001b[0m`);
});

async function main() {
	await Network.loadNetworksAndTokensConfigs();

	await startHttpServer();

	await welcomeMessage();

	while (true) {
		try {
			void waitForKeyPress(
				`${GREEN_TEXT}Configs editor available at: http://localhost:3000/\n\n${GREEN_TEXT}⚠️  Press ENTER to continue with current config\n${RESET}`,
			).then(() => selectionGate.choose('terminal', readConfigs()));

			await selectionGate.waitForChoice();

			const snapshot = selectionGate.getSnapshot() ?? readConfigs();
			const { launchParams, functionParams } = snapshot;

			const licenseResult = await getVerifyLicenseMessage(launchParams);
			await sendTelemetry(licenseResult);

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

			selectionGate.reset();
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
