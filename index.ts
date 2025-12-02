// File: index.ts
import { promptUserForKey, waitForKeyPress } from '@src/utils/prompts';
import { getVerifyLicenseMessage, welcomeMessage } from '@src/utils/welcome';
import { sendTelemetry } from '@src/utils/telemetry';
import { GREEN_TEXT, PURPLE_TEXT, RED_BOLD_TEXT, RESET } from '@src/utils/logger';
import { readConfigs, validateAndFixFunctionParams } from '@src/utils/config-io';
import { startHttpServer, stopHttpServer } from '@src/utils/server/server';
import { selectionGate, type Selector } from '@src/utils/selection';
import { Network } from '@src/utils/network';
import { actionMode } from '@src/utils/actionMode';
import type { LaunchParams } from '@src/utils/types/launchParams.type';
import type { FunctionParams } from '@src/utils/types/functionParams.type';
import {
	startTask,
	withTaskContext,
	finishTask,
	allocateTaskId,
	failTask,
	getCurrentTaskId,
	tasks,
} from '@src/utils/taskManager';
import { validateAndFixAccountFiles } from '@src/utils/workWithSecrets';

// Server configuration
const SERVER_URL = `http://localhost:3000`;

// Constants for selection source types
const SELECTION_SOURCE = {
	TERMINAL: 'terminal' as const,
	UI: 'ui' as const,
};

// Constants for task error types
const TASK_ERROR_TYPE = {
	DECRYPT_ERROR: 'decrypt_error' as const,
	RUN_FAILED: 'run_failed' as const,
};

// Regular expression to detect decryption errors
const DECRYPT_ERROR_PATTERN = /invalid key|couldn'?t decrypt|decrypt(ion)? failed|UI run requires decryption key/i;

process.on('unhandledRejection', (error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\u001b[1;31mUnhandled exception occurred: ${message}\u001b[0m`);
	process.exit(1);
});

/**
 * Gracefully shuts down the application
 * Fails current task, stops HTTP server, and exits the process
 */
const shutdown = (() => {
	let isShuttingDown = false;

	return async (signal: string): Promise<void> => {
		if (isShuttingDown) return;
		isShuttingDown = true;

		console.log(`\n${PURPLE_TEXT}Received ${signal}, shutting down gracefully...${RESET}`);

		// Fail current task if exists
		const currentTaskId = getCurrentTaskId();
		if (currentTaskId && tasks.has(currentTaskId)) {
			failTask(currentTaskId, 'Application shutdown', TASK_ERROR_TYPE.RUN_FAILED);
		}

		// Stop HTTP server
		try {
			await stopHttpServer();
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`${RED_BOLD_TEXT}Error stopping HTTP server: ${errorMessage}${RESET}`);
		}

		process.exit(0);
	};
})();

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

/**
 * Waits for user to choose execution method (terminal or UI)
 * Starts parallel listeners for both terminal and UI selection
 */
async function waitForUserChoice(): Promise<Selector> {
	// Start waiting for terminal selection in parallel with UI
	// waitForKeyPress runs asynchronously and will call selectionGate.choose('terminal') on Enter press
	void waitForKeyPress(
		`${GREEN_TEXT}Configs editor available at: ${SERVER_URL}/\n\n` +
			`${GREEN_TEXT}⚠️  Press ENTER to continue with current config\n${RESET}`,
	).then(() => selectionGate.choose(SELECTION_SOURCE.TERMINAL, readConfigs()));

	// Wait for first choice - from UI (via /api/selection/choose) or from terminal
	// selectionGate ensures that selection can only happen once
	return await selectionGate.waitForChoice();
}

/**
 * Gets encryption key based on selection source
 * UI selections must provide the key upfront, terminal prompts for it
 */
async function getEncryptionKey(chosenBy: Selector, launchParams: LaunchParams): Promise<string | undefined> {
	if (!launchParams.USE_ENCRYPTION) {
		return undefined;
	}

	if (chosenBy === SELECTION_SOURCE.UI) {
		const key = selectionGate.getUiKey();
		if (!key) {
			throw new Error('UI run requires decryption key');
		}
		return key;
	}

	return await promptUserForKey(true);
}

/**
 * Handles task execution errors and reports them appropriately
 * Decryption errors are tagged separately for better diagnostics
 */
function handleTaskError(error: unknown, taskId: number | undefined): void {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`${RED_BOLD_TEXT}${message}${RESET}`);

	// Use existing taskId if it was created, otherwise allocate new one
	const errorTaskId = taskId ?? allocateTaskId();

	const isDecryptError = DECRYPT_ERROR_PATTERN.test(message);
	const errorType = isDecryptError ? TASK_ERROR_TYPE.DECRYPT_ERROR : undefined;

	failTask(errorTaskId, message, errorType);
}

/**
 * Executes a single task iteration
 * Continues the execution loop regardless of success or failure
 */
async function executeTaskIteration(): Promise<void> {
	let taskId: number | undefined;

	try {
		const chosenBy = await waitForUserChoice();
		const snapshot = selectionGate.getSnapshot() ?? readConfigs();

		if (!snapshot.launchParams || !snapshot.functionParams) {
			throw new Error('Invalid configuration: missing launchParams or functionParams');
		}

		const launchParams: LaunchParams = snapshot.launchParams;
		const functionParams: FunctionParams = snapshot.functionParams;

		if (!launchParams.ACTION_PARAMS?.group || !launchParams.ACTION_PARAMS?.action) {
			throw new Error('Invalid configuration: missing ACTION_PARAMS');
		}

		const { group, action } = launchParams.ACTION_PARAMS;

		const licenseResult = await getVerifyLicenseMessage(launchParams);
		await sendTelemetry(licenseResult);

		console.log(`${PURPLE_TEXT}🚀 ${group} -> ${action}\n${RESET}`);

		const key = await getEncryptionKey(chosenBy, launchParams);

		taskId = startTask(group, action);

		await withTaskContext(taskId, async () => {
			await actionMode(launchParams, functionParams, key);
		});

		finishTask(taskId, group, action);
	} catch (error) {
		handleTaskError(error, taskId);
	} finally {
		selectionGate.reset();
	}
}

/**
 * Application entry point
 * Initializes services and runs the main execution loop
 */
async function main() {
	await Network.loadNetworksAndTokensConfigs();
	await startHttpServer();
	await welcomeMessage();

	validateAndFixFunctionParams();
	await validateAndFixAccountFiles();

	while (true) {
		await executeTaskIteration();
	}
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`${RED_BOLD_TEXT}Fatal error: ${message}${RESET}`);
	process.exit(1);
});
