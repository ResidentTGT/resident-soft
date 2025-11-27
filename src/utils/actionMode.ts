import { SecretStorage } from '@utils/secretStorage.type';
import { Account } from '@utils/account';
import { LaunchParams } from '@utils/types/launchParams.type';
import { Logger, MessageType } from './logger';
import { ACTIONS, ActionsGroupName } from '@src/actions';

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

export interface ActionModeParams {
	ACCOUNTS_TO_DO: Account[];
	LAUNCH_PARAMS: LaunchParams;
	FUNCTION_PARAMS: any;
	SECRET_STORAGE: SecretStorage;
	AES_KEY?: string;
	ITERATION: number;
}

export async function actionMode(LAUNCH_PARAMS: LaunchParams, FUNCTION_PARAMS: any, AES_KEY?: string) {
	const secretStorage = parse(
		readFileSync(AES_KEY ? SECRET_STORAGE_ENCRYPTED_PATH : SECRET_STORAGE_DECRYPTED_PATH, 'utf-8'),
	) as SecretStorage;
	const SECRET_STORAGE = AES_KEY ? getEncryptedOrDecryptedSecretStorage(AES_KEY, secretStorage, false) : secretStorage;

	const logger = Logger.getInstance({ telegramParams: SECRET_STORAGE.telegram });

	const allAccounts = await getAllAccounts(
		AES_KEY ? ACCOUNTS_ENCRYPTED_PATH : ACCOUNTS_DECRYPTED_PATH,
		LAUNCH_PARAMS.JOB_ACCOUNTS.map((a) => a.file),
	);
	const filteredAccs = await filterAccounts(allAccounts, LAUNCH_PARAMS);
	const ACCOUNTS = AES_KEY ? getEncryptedOrDecryptedAccounts(AES_KEY, filteredAccs, false) : filteredAccs;

	const group = ACTIONS.find((g) => g.group === LAUNCH_PARAMS.ACTION_PARAMS.group);

	if (!group) throw new Error(`Group doesn't exist: ${LAUNCH_PARAMS.ACTION_PARAMS.group}`);

	const licenseValid = (await verifyLicense(LAUNCH_PARAMS.LICENSE)).ok;

	if (group.premium && !licenseValid) throw new Error(`Group is only for PREMIUM users: ${LAUNCH_PARAMS.ACTION_PARAMS.group}`);

	const action = group.actions.find((a) => a.action === LAUNCH_PARAMS.ACTION_PARAMS.action);
	if (!action) throw new Error(`Action doesn't exist: ${JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)}`);

	let message = `Action: ${LAUNCH_PARAMS.ACTION_PARAMS.group} | ${LAUNCH_PARAMS.ACTION_PARAMS.action}`;
	const groupFParams = FUNCTION_PARAMS[LAUNCH_PARAMS.ACTION_PARAMS.group];
	if (groupFParams && groupFParams[LAUNCH_PARAMS.ACTION_PARAMS.action]) {
		FUNCTION_PARAMS = groupFParams[LAUNCH_PARAMS.ACTION_PARAMS.action];
		message += ` | ${JSON.stringify(groupFParams[LAUNCH_PARAMS.ACTION_PARAMS.action])}\n`;
	}

	await logger.log(message, MessageType.Info);

	const allHandlers = new Map(FREE_HANDLERS);

	let handler;
	if (licenseValid) {
		let PREMIUM_HANDLERS: any;
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			PREMIUM_HANDLERS = require('src/premium/handlersList').PREMIUM_HANDLERS;
		} catch {
			PREMIUM_HANDLERS = [];
		}
		(PREMIUM_HANDLERS as Map<ActionsGroupName, BaseHandler>).forEach((handler, group) => {
			allHandlers.set(group, handler);
		});

		handler = allHandlers.get(LAUNCH_PARAMS.ACTION_PARAMS.group);
	} else handler = FREE_HANDLERS.get(LAUNCH_PARAMS.ACTION_PARAMS.group);
	if (!handler)
		throw new Error(
			`No handler for ${JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)}! Try to decrypt folder. p.4 here https://resident.gitbook.io/resident-soft/launch/for-developers`,
		);

	const chainIdFields = Object.keys(FUNCTION_PARAMS)
		.filter((k) => k.toUpperCase().includes('CHAINID'))
		.map((k) => FUNCTION_PARAMS[k]);

	for (const id of chainIdFields) Network.checkChainId(id);

	for (let i = 0; i < LAUNCH_PARAMS.NUMBER_OF_EXECUTIONS; i++) {
		const ACCOUNTS_TO_DO = LAUNCH_PARAMS.SHUFFLE_ACCOUNTS ? shuffleArray(ACCOUNTS.slice()) : ACCOUNTS.slice();

		const params: ActionModeParams = {
			ACCOUNTS_TO_DO,
			LAUNCH_PARAMS,
			FUNCTION_PARAMS,
			SECRET_STORAGE,
			ITERATION: i + 1,
			AES_KEY,
		};

		await handler.handleAction(params);
	}
}
