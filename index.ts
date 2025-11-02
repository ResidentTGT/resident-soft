import { promptUserForKey, waitForKeyPress } from '@src/utils/prompts';
import { getVerifyLicenseMessage, welcomeMessage } from '@src/utils/welcome';
import { sendTelemetry } from '@src/utils/telemetry';
import { GREEN_TEXT, PURPLE_TEXT, RED_BOLD_TEXT, RESET, MessageType } from '@src/utils/logger';
import { readConfigs } from '@src/utils/config-io';
import { startHttpServer } from '@src/utils/server/server';
import { selectionGate, type RunRequest } from '@src/utils/selection';
import { Network } from '@src/utils/network';
import { actionMode } from '@src/utils/actionMode';
import { startTask, withTaskContext, finishTask, failTask } from '@src/utils/taskManager';
import { broadcast } from '@src/utils/server/sse';

process.on('unhandledRejection', async (error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\u001b[1;31mUnhandled exception occurred: ${message}\u001b[0m`);
});

async function handleRun(evt: RunRequest) {
	try {
		const snapshot = evt.snapshot ?? readConfigs();
		const { launchParams, functionParams } = snapshot;
		const group = (launchParams as any).ACTION_PARAMS?.group;
		const action = (launchParams as any).ACTION_PARAMS?.action;

		const licenseResult = await getVerifyLicenseMessage(launchParams);
		await sendTelemetry(licenseResult);

		console.log(`${PURPLE_TEXT}🚀 ${group} -> ${action}\n${RESET}`);

		let key: string | undefined;
		if ((launchParams as any).USE_ENCRYPTION) {
			if (evt.by === 'ui') {
				key = evt.key;
				if (!key) {
					const err = 'UI run requires decryption key';
					// No task yet — emit a global error over SSE
					broadcast({ type: MessageType.Error, eventName: 'task_failed', payload: { error: err } });
					return;
				}
			} else {
				key = await promptUserForKey(true);
			}
		}

		// Create task and bind ALS context
		const taskId = startTask(launchParams, functionParams);
		void withTaskContext(taskId, async () => {
			try {
				await actionMode(launchParams, functionParams, key);
				finishTask(taskId);
			} catch (e: any) {
				const message = e instanceof Error ? e.message : String(e);
				failTask(taskId, message);
			}
		});
	} catch (error: any) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`${RED_BOLD_TEXT}${message}${RESET}`);
		// Global error (no taskId): broadcast only
		const isDecryptError = /invalid key|couldn'?t decrypt|decrypt(ion)? failed|UI run requires decryption key/i.test(message);
		broadcast({
			type: isDecryptError ? MessageType.Warn : MessageType.Error,
			eventName: 'task_failed',
			payload: { error: message },
		});
	}
}

async function main() {
	await Network.loadNetworksAndTokensConfigs();
	await startHttpServer();
	await welcomeMessage();

	selectionGate.on('run', (evt: RunRequest) => {
		handleRun(evt);
	});

	void waitForKeyPress(
		`${GREEN_TEXT}Configs editor available at: http://localhost:3000/\n\n` +
			`${GREEN_TEXT}⚠️ Press ENTER to start with current config (parallel supported)\n${RESET}`,
	).then(() => selectionGate.choose('terminal', readConfigs()));
}

main().catch(console.error);
