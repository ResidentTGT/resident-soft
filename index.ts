import { promptUserForKey, waitForKeyPress } from '@src/utils/prompts';
import { getVerifyLicenseMessage, welcomeMessage } from '@src/utils/welcome';
import { sendTelemetry } from '@src/utils/telemetry';
import { GREEN_TEXT, PURPLE_TEXT, RED_BOLD_TEXT, RESET } from '@src/utils/logger';
import { readConfigs } from '@src/utils/config-io';
import { startHttpServer } from '@src/utils/server/server';
import { selectionGate } from '@src/utils/selection';
import { Network } from '@src/utils/network';
import { broadcastStatus } from '@src/utils/server/sse';
import { actionMode } from '@src/utils/actionMode';

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

			const chosenBy = await selectionGate.waitForChoice();

			const snapshot = selectionGate.getSnapshot() ?? readConfigs();
			const { launchParams, functionParams } = snapshot;

			const licenseResult = await getVerifyLicenseMessage(launchParams);
			await sendTelemetry(licenseResult);

			console.log(
				`${PURPLE_TEXT}🚀 ${snapshot.launchParams.ACTION_PARAMS.group} -> ${snapshot.launchParams.ACTION_PARAMS.action}\n${RESET}`,
			);

			let key: string | undefined;

			if (launchParams.USE_ENCRYPTION) {
				if (chosenBy === 'ui') {
					key = selectionGate.getUiKey();
					if (!key) {
						broadcastStatus('decrypt_error', { message: 'Не передан ключ расшифровки из UI' });
						throw new Error('UI run requires decryption key');
					}
				} else {
					key = await promptUserForKey(true);
				}
			}

			broadcastStatus('run_started', {
				group: snapshot.launchParams.ACTION_PARAMS.group,
				action: snapshot.launchParams.ACTION_PARAMS.action,
			});

			await actionMode(launchParams, functionParams, key);

			selectionGate.reset();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`${RED_BOLD_TEXT}${message}${RESET}`);

			selectionGate.reset();
			const isDecryptError = /invalid key|couldn'?t decrypt|decrypt(ion)? failed|UI run requires decryption key/i.test(
				message,
			);
			if (isDecryptError) {
				broadcastStatus('decrypt_error', { message });
				continue;
			}

			broadcastStatus('run_failed', { message });
		}
	}
}

main().catch(console.error);
