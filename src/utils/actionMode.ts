import { SecretStorage } from '@utils/secretStorage.type';
import { Account } from '@utils/account';
import { LaunchParams } from '@utils/types/launchParams.type';
import { Logger, MessageType } from './logger';
import { ACTIONS, ActionsGroupName, ActionsGroup, Action } from '@src/actions';

import { FREE_HANDLERS } from '@src/free/handlersList';
import { BaseHandler } from './handler';
import { verifyLicense } from './licenses';
import { Network } from './network';
import { shuffleArray } from './shuffleArray';
import { parse } from 'jsonc-parser';
import {
	SECRET_STORAGE_ENCRYPTED_PATH,
	SECRET_STORAGE_DECRYPTED_PATH,
	ACCOUNTS_ENCRYPTED_PATH,
	ACCOUNTS_DECRYPTED_PATH,
} from '@src/constants';
import { readFileSync } from 'fs';
import { getEncryptedOrDecryptedSecretStorage, getEncryptedOrDecryptedAccounts } from './decryption';
import { filterAccounts } from './filterAccounts';
import { getAllAccounts } from './getAllAccounts';
import { getStandardState } from './state';
import { StandardStateStatus } from './state/standardState.interface';
import { broadcastFailState, broadcastFinishState, getCurrentStateName, broadcastStartState } from './stateManager';

/**
 * Error messages used throughout action execution
 */
const ERROR_MESSAGES = {
	ACTION_EXECUTION_FAILED: 'Возникла ошибка при выполнении действия',
} as const;

export interface ActionModeParams {
	ACCOUNTS_TO_DO: Account[];
	LAUNCH_PARAMS: LaunchParams;
	FUNCTION_PARAMS: any;
	SECRET_STORAGE: SecretStorage;
	AES_KEY?: string;
	ITERATION: number;
}

interface LoadedData {
	secretStorage: SecretStorage;
	accounts: Account[];
	logger: Logger;
}

interface ValidatedAction {
	group: ActionsGroup;
	action: Action;
}

/**
 * Initializes state with Process status
 */
export function initializeState(stateName: string): void {
	const STATE = getStandardState(stateName);
	STATE.status = StandardStateStatus.Process;
	STATE.save();
}

/**
 * Finalizes state with Finish status
 */
function finalizeStateSuccess(stateName: string): void {
	const STATE = getStandardState(stateName);
	STATE.status = StandardStateStatus.Finish;
	STATE.save();
}

/**
 * Finalizes state with Fail status and error message
 */
function finalizeStateFailure(stateName: string, error: unknown): void {
	const STATE = getStandardState(stateName);
	STATE.status = StandardStateStatus.Fail;
	STATE.info = `${ERROR_MESSAGES.ACTION_EXECUTION_FAILED}. ${error}`;
	STATE.save();
}

/**
 * Loads and decrypts secret storage
 */
function loadSecretStorage(aesKey?: string): SecretStorage {
	const storagePath = aesKey ? SECRET_STORAGE_ENCRYPTED_PATH : SECRET_STORAGE_DECRYPTED_PATH;
	const secretStorage = parse(readFileSync(storagePath, 'utf-8')) as SecretStorage;

	return aesKey ? getEncryptedOrDecryptedSecretStorage(aesKey, secretStorage, false) : secretStorage;
}

/**
 * Loads, filters and decrypts accounts
 */
async function loadAccounts(launchParams: LaunchParams, aesKey?: string): Promise<Account[]> {
	const accountsPath = aesKey ? ACCOUNTS_ENCRYPTED_PATH : ACCOUNTS_DECRYPTED_PATH;
	const accountFiles = launchParams.JOB_ACCOUNTS.map((a) => a.file);

	const allAccounts = await getAllAccounts(accountsPath, accountFiles);
	const filteredAccs = await filterAccounts(allAccounts, launchParams);

	return aesKey ? getEncryptedOrDecryptedAccounts(aesKey, filteredAccs, false) : filteredAccs;
}

/**
 * Loads all necessary data (secrets, accounts, logger)
 */
async function loadData(launchParams: LaunchParams, aesKey?: string): Promise<LoadedData> {
	const secretStorage = loadSecretStorage(aesKey);
	const logger = Logger.getInstance({ telegramParams: secretStorage.telegram });
	const accounts = await loadAccounts(launchParams, aesKey);

	return { secretStorage, accounts, logger };
}

/**
 * Validates that the requested action and group exist and are accessible
 */
export async function validateActionAndGroup(launchParams: LaunchParams): Promise<ValidatedAction> {
	const group = ACTIONS.find((g) => g.group === launchParams.ACTION_PARAMS.group);

	if (!group) {
		throw new Error(`Group doesn't exist: ${launchParams.ACTION_PARAMS.group}`);
	}

	const action = group.actions.find((a) => a.action === launchParams.ACTION_PARAMS.action);

	if (!action) {
		throw new Error(`Action doesn't exist: ${JSON.stringify(launchParams.ACTION_PARAMS)}`);
	}

	return { group, action };
}

/**
 * Extracts function parameters for specific action
 */
function extractFunctionParams(allParams: any, launchParams: LaunchParams): any {
	const groupParams = allParams[launchParams.ACTION_PARAMS.group];

	if (groupParams && groupParams[launchParams.ACTION_PARAMS.action]) {
		return groupParams[launchParams.ACTION_PARAMS.action];
	}

	return {};
}

/**
 * Builds log message for action execution
 */
function buildLogMessage(launchParams: LaunchParams, functionParams: any): string {
	let message = `Action: ${launchParams.ACTION_PARAMS.group} | ${launchParams.ACTION_PARAMS.action}`;

	if (functionParams && Object.keys(functionParams).length > 0) {
		message += ` | ${JSON.stringify(functionParams)}\n`;
	}

	return message;
}

/**
 * Loads premium handlers if available
 */
function loadPremiumHandlers(): Map<ActionsGroupName, BaseHandler> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const premiumModule = require('src/premium/handlersList');
		return premiumModule.PREMIUM_HANDLERS as Map<ActionsGroupName, BaseHandler>;
	} catch {
		return new Map();
	}
}

/**
 * Gets the appropriate handler for the action group
 */
function getHandler(groupName: ActionsGroupName, hasValidLicense: boolean): BaseHandler {
	const allHandlers = new Map(FREE_HANDLERS);

	if (hasValidLicense) {
		const premiumHandlers = loadPremiumHandlers();
		premiumHandlers.forEach((handler, group) => {
			allHandlers.set(group, handler);
		});
	}

	const handler = allHandlers.get(groupName);

	if (!handler) {
		throw new Error(
			`No handler for group "${groupName}"! Try to decrypt folder. See: https://resident.gitbook.io/resident-soft/launch/for-developers`,
		);
	}

	return handler;
}

/**
 * Validates all chain IDs in function parameters
 */
function validateChainIds(functionParams: any): void {
	if (!functionParams || typeof functionParams !== 'object') {
		return;
	}

	const chainIdFields = Object.keys(functionParams)
		.filter((key) => key.toUpperCase().includes('CHAINID'))
		.map((key) => functionParams[key]);

	for (const chainId of chainIdFields) {
		Network.checkChainId(chainId);
	}
}

/**
 * Validates launch parameters
 */
function validateLaunchParams(launchParams: LaunchParams): void {
	if (launchParams.NUMBER_OF_EXECUTIONS <= 0) {
		throw new Error(`NUMBER_OF_EXECUTIONS must be positive, got: ${launchParams.NUMBER_OF_EXECUTIONS}`);
	}
}

/**
 * Generates state name if not provided
 */
export function generateStateName(launchParams: LaunchParams, group: ActionsGroup, action: Action): string {
	if (launchParams.TAKE_STATE && launchParams.STATE_NAME) {
		return launchParams.STATE_NAME;
	}

	const timestamp = formatTimestampRussian(new Date());
	return `${group.name}_${action.name}_${timestamp}`;
}

/**
 * Formats timestamp in Russian format: DD.MM.YYYY_HH-MM-SS
 */
export function formatTimestampRussian(date: Date): string {
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');

	return `${day}.${month}.${year}_${hours}-${minutes}-${seconds}`;
}

export async function actionMode(LAUNCH_PARAMS: LaunchParams, FUNCTION_PARAMS: any, AES_KEY?: string) {
	const stateName = getCurrentStateName();
	if (!stateName) throw new Error('State name is not defined');

	try {
		initializeState(stateName);
		broadcastStartState(LAUNCH_PARAMS.ACTION_PARAMS.group, LAUNCH_PARAMS.ACTION_PARAMS.action);

		const licenseValid = (await verifyLicense(LAUNCH_PARAMS.LICENSE)).ok;

		const { group, action } = await validateActionAndGroup(LAUNCH_PARAMS);

		if (group.premium && !licenseValid) {
			throw new Error(`Group is only for PREMIUM users: ${group.name}`);
		}

		const { secretStorage: SECRET_STORAGE, accounts: ACCOUNTS, logger } = await loadData(LAUNCH_PARAMS, AES_KEY);
		const actionFunctionParams = extractFunctionParams(FUNCTION_PARAMS, LAUNCH_PARAMS);

		await logger.log(buildLogMessage(LAUNCH_PARAMS, actionFunctionParams), MessageType.Info);

		const handler = getHandler(LAUNCH_PARAMS.ACTION_PARAMS.group, licenseValid);
		validateLaunchParams(LAUNCH_PARAMS);
		validateChainIds(actionFunctionParams);

		for (let iterationIndex = 0; iterationIndex < LAUNCH_PARAMS.NUMBER_OF_EXECUTIONS; iterationIndex++) {
			const accountsToProcess = LAUNCH_PARAMS.SHUFFLE_ACCOUNTS ? shuffleArray(ACCOUNTS.slice()) : ACCOUNTS.slice();

			const params: ActionModeParams = {
				ACCOUNTS_TO_DO: accountsToProcess,
				LAUNCH_PARAMS: {
					...LAUNCH_PARAMS,
					STATE_NAME: stateName,
				},
				FUNCTION_PARAMS: actionFunctionParams,
				SECRET_STORAGE,
				ITERATION: iterationIndex + 1,
				AES_KEY,
			};

			if (action.isolated) {
				await handler.actionIsolated(params);
			} else {
				await handler.executeJoint(params);
			}
		}

		finalizeStateSuccess(stateName);
		broadcastFinishState(LAUNCH_PARAMS.ACTION_PARAMS.group, LAUNCH_PARAMS.ACTION_PARAMS.action);
	} catch (e: any) {
		finalizeStateFailure(stateName, e);
		broadcastFailState(e);
		throw e;
	}
}
