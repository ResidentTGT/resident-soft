// File: index.ts
import { promptUserForKey, waitForKeyPress } from '@src/utils/prompts';
import { welcomeMessage } from '@src/utils/welcome';
import { GREEN_TEXT, PURPLE_TEXT, RED_BOLD_TEXT, RESET } from '@src/utils/logger';
import { readConfigs, validateAndFixFunctionParams } from '@src/utils/config-io';
import { startHttpServer } from '@src/utils/server/server';
import { Network } from '@src/utils/network';
import type { LaunchParams } from '@src/utils/types/launchParams.type';
import { validateAndFixAccountFiles } from '@src/utils/workWithSecrets';
import { setupUnhandledRejectionHandler } from '@src/utils/errors';

import { activeTasksTracker } from '@src/utils/activeTasks';
import { executeTask, failAllProcessStates } from '@src/utils/taskExecutor';

const SERVER_URL = `http://localhost:3000`;

setupUnhandledRejectionHandler();

async function handleTerminalLaunch(): Promise<void> {
	try {
		const configs = readConfigs();

		if (!configs.launchParams || !configs.functionParams) {
			console.log(`${RED_BOLD_TEXT}Invalid configuration: missing params${RESET}`);
			return;
		}

		const launchParams: LaunchParams = configs.launchParams;
		const functionParams = configs.functionParams;

		if (!launchParams.ACTION_PARAMS?.group || !launchParams.ACTION_PARAMS?.action) {
			console.log(`${RED_BOLD_TEXT}Invalid configuration: missing ACTION_PARAMS${RESET}`);
			return;
		}

		let encryptionKey: string | undefined;
		if (launchParams.USE_ENCRYPTION) {
			encryptionKey = await promptUserForKey(true);
		}

		const stateName = await executeTask(launchParams, functionParams, encryptionKey);
		console.log(`${GREEN_TEXT}✓ Task started: ${stateName}${RESET}`);
		console.log(`${GREEN_TEXT}  Running tasks: ${activeTasksTracker.getActiveCount()}${RESET}\n`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`${RED_BOLD_TEXT}Failed to start task: ${message}${RESET}`);
	}
}

async function terminalInterface(): Promise<void> {
	while (true) {
		console.log(`${GREEN_TEXT}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
		console.log(`${GREEN_TEXT}Config editor: ${SERVER_URL}/${RESET}`);
		console.log(`${GREEN_TEXT}Running tasks: ${activeTasksTracker.getActiveCount()}${RESET}`);
		console.log(`${GREEN_TEXT}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
		console.log(`${GREEN_TEXT}Press ENTER to launch new task with current config${RESET}`);
		console.log(`${GREEN_TEXT}Press Ctrl+C to exit${RESET}\n`);

		await waitForKeyPress('');
		await handleTerminalLaunch();
	}
}

async function main() {
	const interruptedCount = await failAllProcessStates();
	if (interruptedCount > 0) {
		console.log(`${PURPLE_TEXT}Marked ${interruptedCount} interrupted task(s) as failed from previous session${RESET}\n`);
	}

	await Network.loadNetworksAndTokensConfigs();
	await startHttpServer();
	await welcomeMessage();

	validateAndFixFunctionParams();
	await validateAndFixAccountFiles();

	await terminalInterface();
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`${RED_BOLD_TEXT}Fatal error: ${message}${RESET}`);
	process.exit(1);
});
