import { activeTasksTracker } from './activeTasks';
import { actionMode, generateStateName, validateActionAndGroup } from './actionMode';
import { withStateContext, broadcastFailState } from './stateManager';
import type { LaunchParams } from './types/launchParams.type';
import { PURPLE_TEXT, RED_BOLD_TEXT, RESET } from './logger';
import { StateStorage } from '@src/utils/state/state';
import { StandardStateStatus, type StandardState } from '@src/utils/state/standardState.interface';
import fs from 'node:fs';
import path from 'node:path';

const DECRYPT_ERROR_PATTERN = /invalid key|couldn'?t decrypt|decrypt(ion)? failed|UI run requires decryption key/i;

export async function executeTask(launchParams: LaunchParams, functionParams: any, encryptionKey?: string): Promise<string> {
	const { group, action } = validateActionAndGroup(launchParams);
	const stateName = generateStateName(launchParams, group, action);
	launchParams.STATE_NAME = stateName;

	activeTasksTracker.registerTask(stateName);

	void (async () => {
		try {
			console.log(`${PURPLE_TEXT}🚀 [${stateName}] ${group.name} -> ${action.name}\n${RESET}`);

			await withStateContext(stateName, async () => {
				await actionMode(launchParams, functionParams, encryptionKey);
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`${RED_BOLD_TEXT}[${stateName}] ${message}${RESET}`);

			const isDecryptError = DECRYPT_ERROR_PATTERN.test(message);
			const errorType = isDecryptError ? 'decrypt_error' : 'run_failed';

			try {
				await withStateContext(stateName, async () => {
					broadcastFailState(message, errorType);
				});
			} catch {
				//
			}
		} finally {
			activeTasksTracker.unregisterTask(stateName);
		}
	})();

	return stateName;
}

export function checkTaskCancellation(stateName: string): void {
	if (activeTasksTracker.isCancelled(stateName)) {
		throw new Error('Задача остановлена пользователем.');
	}
}

/**
 * Marks all states with "Process" status as "Fail" on startup
 * This ensures that tasks interrupted by system crash/restart are properly marked as failed
 * @returns Number of states that were marked as failed
 */
export async function failAllProcessStates(): Promise<number> {
	let failedCount = 0;

	try {
		const statesDir = path.resolve(process.cwd(), 'states');
		if (!fs.existsSync(statesDir)) {
			return 0;
		}

		const files = fs.readdirSync(statesDir).filter((f) => f.endsWith('.json'));

		for (const file of files) {
			try {
				const name = path.basename(file, '.json');
				const state = StateStorage.load<StandardState>(name, {
					defaultState: {
						fails: [],
						successes: [],
						info: '',
						status: StandardStateStatus.Idle,
					},
					readable: true,
					fileExt: '.json',
				});

				// If state is in Process, mark it as Failed
				if (state.status === StandardStateStatus.Process) {
					state.status = StandardStateStatus.Fail;
					state.info += '\nTask interrupted by system restart';
					state.save();
					failedCount++;
				}
			} catch (error) {
				// Skip files that can't be processed
				console.error(`${RED_BOLD_TEXT}Failed to process state file ${file}: ${error}${RESET}`);
			}
		}
	} catch (error) {
		console.error(`${RED_BOLD_TEXT}Error failing process states: ${error}${RESET}`);
	}

	return failedCount;
}
