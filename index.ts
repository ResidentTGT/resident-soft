// File: index.ts
import { promptUserForKey, waitForKeyPress } from '@src/utils/prompts';
import { getVerifyLicenseMessage, welcomeMessage } from '@src/utils/welcome';
import { sendTelemetry } from '@src/utils/telemetry';
import { GREEN_TEXT, PURPLE_TEXT, RED_BOLD_TEXT, RESET } from '@src/utils/logger';
import { readConfigs } from '@src/utils/config-io';
import { startHttpServer } from '@src/utils/server/server';
import { selectionGate } from '@src/utils/selection';
import { Network } from '@src/utils/network';
import { actionMode } from '@src/utils/actionMode';
import { startTask, withTaskContext, finishTask, allocateTaskId, failTask } from '@src/utils/taskManager';

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
				`${GREEN_TEXT}Configs editor available at: http://localhost:3000/\n\n` +
					`${GREEN_TEXT}⚠️  Press ENTER to continue with current config\n${RESET}`,
			).then(() => selectionGate.choose('terminal', readConfigs()));

			const chosenBy = await selectionGate.waitForChoice();
			const snapshot = selectionGate.getSnapshot() ?? readConfigs();
			const { launchParams, functionParams } = snapshot;
			const group = launchParams.ACTION_PARAMS.group;
			const action = launchParams.ACTION_PARAMS.action;

			const licenseResult = await getVerifyLicenseMessage(launchParams);
			await sendTelemetry(licenseResult);

			console.log(`${PURPLE_TEXT}🚀 ${group} -> ${action}\n${RESET}`);

			let key: string | undefined;
			if (launchParams.USE_ENCRYPTION) {
				if (chosenBy === 'ui') {
					key = selectionGate.getUiKey();
					if (!key) {
						throw new Error('UI run requires decryption key');
					}
				} else {
					key = await promptUserForKey(true);
				}
			}

			const taskId = startTask(group, action);

			await withTaskContext(taskId, async () => {
				await actionMode(launchParams, functionParams, key);
			});

			finishTask(taskId, group, action);

			selectionGate.reset();
		} catch (error: any) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`${RED_BOLD_TEXT}${message}${RESET}`);

			selectionGate.reset();

			const isDecryptError = /invalid key|couldn'?t decrypt|decrypt(ion)? failed|UI run requires decryption key/i.test(
				message,
			);
			if (isDecryptError) {
				const errorId = allocateTaskId();
				failTask(errorId, message, 'decrypt_error');
				continue;
			}

			const errorId = allocateTaskId();
			failTask(errorId, message);
		}
	}
}

main().catch(console.error);
