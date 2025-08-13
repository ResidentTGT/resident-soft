import { SecretStorage } from '@utils/secretStorage.type';
import { Account } from '@utils/account';
import { LaunchParams } from '@utils/launchParams.type';
import { Logger, MessageType } from './logger';
import { ACTIONS, ActionsGroupName } from '@src/actions';

import { FREE_HANDLERS } from '@src/free/handlersList';
import { promises as fs } from 'fs';
import path from 'path';
import { BaseHandler } from './handler';
import { verifyLicense } from './licenses';

export interface ActionModeParams {
	ACCOUNTS_TO_DO: Account[];
	LAUNCH_PARAMS: LaunchParams;
	FUNCTION_PARAMS: any;
	SECRET_STORAGE: SecretStorage;
	AES_KEY?: string;
	ITERATION: number;
}

export async function actionMode(
	ACCOUNTS: Account[],
	SECRET_STORAGE: SecretStorage,
	LAUNCH_PARAMS: LaunchParams,
	FUNCTION_PARAMS: any,
	AES_KEY?: string,
) {
	const logger = Logger.getInstance();

	const group = ACTIONS.find((g) => g.group === LAUNCH_PARAMS.ACTION_PARAMS.group);

	if (!group) throw new Error(`Group doesn't exist: ${LAUNCH_PARAMS.ACTION_PARAMS.group}`);

	if (group.premium && !(await verifyLicense(LAUNCH_PARAMS.LICENSE)).ok)
		throw new Error(`Group is only for PREMIUM users: ${LAUNCH_PARAMS.ACTION_PARAMS.group}`);

	const action = group.actions.find((a) => a.action === LAUNCH_PARAMS.ACTION_PARAMS.action);
	if (!action) throw new Error(`Action doesn't exist: ${JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)}`);

	let message = `Action: ${LAUNCH_PARAMS.ACTION_PARAMS.group} | ${LAUNCH_PARAMS.ACTION_PARAMS.action}`;
	const groupFParams = FUNCTION_PARAMS[LAUNCH_PARAMS.ACTION_PARAMS.group];
	if (groupFParams && groupFParams[LAUNCH_PARAMS.ACTION_PARAMS.action]) {
		FUNCTION_PARAMS = groupFParams[LAUNCH_PARAMS.ACTION_PARAMS.action];
		message += ` | ${JSON.stringify(groupFParams[LAUNCH_PARAMS.ACTION_PARAMS.action])}`;
	}

	await logger.log(message, MessageType.Info);

	const allHandlers = new Map(FREE_HANDLERS);

	let handler;
	if ((await verifyLicense(LAUNCH_PARAMS.LICENSE)).ok) {
		const { PREMIUM_HANDLERS } = await importIfExists<any>('premium/handlersList.js');

		(PREMIUM_HANDLERS as Map<ActionsGroupName, BaseHandler>).forEach((handler, group) => {
			allHandlers.set(group, handler);
		});

		handler = allHandlers.get(LAUNCH_PARAMS.ACTION_PARAMS.group);
	} else handler = FREE_HANDLERS.get(LAUNCH_PARAMS.ACTION_PARAMS.group);
	if (!handler) throw new Error(`No handler for ${JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)}!`);

	for (let i = 0; i < LAUNCH_PARAMS.NUMBER_OF_EXECUTIONS; i++) {
		const ACCOUNTS_TO_DO = LAUNCH_PARAMS.SHUFFLE_ACCOUNTS ? ACCOUNTS.slice().shuffle() : ACCOUNTS.slice();

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

async function importIfExists<T = any>(alias: string): Promise<T | null> {
	const fullPath = path.resolve(process.cwd(), `build/src/${alias}`);

	try {
		await fs.access(fullPath);
	} catch (err: any) {
		if (err.code === 'ENOENT')
			throw new Error(
				`src/premium not allowed (${fullPath}). Try to decrypt folder. p.4 here https://resident.gitbook.io/resident-soft/launch/for-developers`,
			);

		throw err;
	}

	try {
		const mod = await import(`../` + alias);

		return (mod as { default?: T }).default ?? (mod as T);
	} catch (err: any) {
		if (err.code === 'ERR_MODULE_NOT_FOUND') throw new Error(`Couldnt load module: ${alias}`);

		throw err;
	}
}
