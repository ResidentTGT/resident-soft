import { ActionModeParams } from '@utils/actionMode';
import { Account } from '@utils/account';
import { ChainId } from '@utils/network';
import { SecretStorage } from '@utils/secretStorage.type';
import { Action, ActionName, ActionParams, ACTIONS, ActionsGroupName } from '@src/actions';
import { delay } from './delay';
import { Logger, MessageType } from './logger';
import Random from './random';
import { rotateProxy } from './rotateProxy';
import { setProxy } from './setProxy';
import { getStandardState } from './state';
import { getExplorerUrl } from './getExplorerUrl';

export interface IsolatedHandlerParams {
	account: Account;
	secretStorage: SecretStorage;
	aesKey?: string;
	actionParams: ActionParams;
	functionParams: any;
}

export interface Handler {
	executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }>;

	executeJoint(params: ActionModeParams): Promise<void>;
}

export abstract class BaseHandler implements Handler {
	public group: ActionsGroupName;

	constructor(group: ActionsGroupName) {
		this.group = group;
	}

	abstract executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }>;

	abstract executeJoint(params: ActionModeParams): Promise<void>;

	async handleAction(params: ActionModeParams) {
		const group = ACTIONS.find((g) => g.group === this.group);
		if (!group) throw new Error(`Group doesn't exist: ${this.group}`);

		const action = group.actions.find((a) => a.action === params.LAUNCH_PARAMS.ACTION_PARAMS.action);
		if (!action) throw new Error(`Action doesn't exist: ${JSON.stringify(params.LAUNCH_PARAMS.ACTION_PARAMS)}`);

		if (action.isolated) await this.actionIsolated(params);
		else await this.executeJoint(params);
	}

	unsupportedAction(action: ActionName) {
		throw new Error(`Unsupported ${this.group} action: ${action}`);
	}

	async actionIsolated(actionModeParams: ActionModeParams): Promise<void> {
		const { LAUNCH_PARAMS, FUNCTION_PARAMS, SECRET_STORAGE, ITERATION, AES_KEY } = actionModeParams;

		const logger = Logger.getInstance();

		const action = ACTIONS.find((g) => g.group === LAUNCH_PARAMS.ACTION_PARAMS.group)?.actions.find(
			(a) => a.action === LAUNCH_PARAMS.ACTION_PARAMS.action,
		);
		if (!action) throw new Error(`Action doesn't exist: ${JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)}`);

		let ACCOUNTS_TO_DO = actionModeParams.ACCOUNTS_TO_DO.slice();

		let fails: string[] = [];
		const successes: string[] = [];
		let finish;
		let attemptsUntilSuccess = 0;
		while (!finish && attemptsUntilSuccess < LAUNCH_PARAMS.ATTEMPTS_UNTIL_SUCCESS) {
			attemptsUntilSuccess++;
			await logger.log(
				`Iteration ${ITERATION}. Attempt ${attemptsUntilSuccess}. Accounts (${ACCOUNTS_TO_DO.length}): ${ACCOUNTS_TO_DO.map((a) => a.name).join(',')}\n`,
				MessageType.Info,
			);
			const createPromise = async (account: Account, index: number) => {
				const accountName = account.name ?? '';
				try {
					await logger.log(
						this.generateAccountMessage(
							index,
							ACCOUNTS_TO_DO.length,
							account,
							`started`,
							this.getChainIdForLog(action, actionModeParams),
						),
						MessageType.Info,
					);

					if (LAUNCH_PARAMS.PROXY && account.proxy) {
						if (LAUNCH_PARAMS.ROTATE_PROXY) await rotateProxy(account.proxy?.rotateUrl as any);
						if (!LAUNCH_PARAMS.ROTATE_PROXY) await setProxy(account.proxy);
					}

					const result = await this.executeIsolated({
						account: account,
						secretStorage: SECRET_STORAGE,
						aesKey: AES_KEY,
						actionParams: LAUNCH_PARAMS.ACTION_PARAMS,
						functionParams: FUNCTION_PARAMS,
					});

					successes.push(accountName);
					fails = fails.filter((f) => f !== accountName);

					if (LAUNCH_PARAMS.TAKE_STATE && LAUNCH_PARAMS.STATE_NAME) {
						const STATE = getStandardState(LAUNCH_PARAMS.STATE_NAME);
						STATE.successes.push(accountName);
						STATE.fails = STATE.fails.filter((f: string) => f !== accountName);
						STATE.save();
					}
					await logger.log(
						this.generateAccountMessage(
							index,
							ACCOUNTS_TO_DO.length,
							account,
							`finished`,
							this.getChainIdForLog(action, actionModeParams),
						),
						MessageType.Info,
					);
					if (LAUNCH_PARAMS.DELAY_BETWEEN_ACCS_IN_S[1] && index !== ACCOUNTS_TO_DO.length - 1) {
						const waiting = Random.int(
							LAUNCH_PARAMS.DELAY_BETWEEN_ACCS_IN_S[0],
							LAUNCH_PARAMS.DELAY_BETWEEN_ACCS_IN_S[1],
						);
						if (!(result && (result as any).skipDelay)) {
							await logger.log(`Waiting ${waiting} s. ...`);
							await delay(waiting);
						}
					}
				} catch (err: any) {
					if (!fails.includes(accountName)) {
						fails.push(accountName);
					}
					if (LAUNCH_PARAMS.TAKE_STATE && LAUNCH_PARAMS.STATE_NAME) {
						const STATE = getStandardState(LAUNCH_PARAMS.STATE_NAME);
						if (!STATE.fails.includes(accountName)) {
							STATE.fails.push(accountName);
							STATE.save();
						}
					}
					await logger.log(
						this.generateAccountMessage(
							index,
							ACCOUNTS_TO_DO.length,
							account,
							`\nAction: ${JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)}\n${err.stack}`,
							this.getChainIdForLog(action, actionModeParams),
						),
						MessageType.Error,
					);
					if (LAUNCH_PARAMS.DELAY_AFTER_ERROR_IN_S > 0) {
						await logger.log(`Waiting ${LAUNCH_PARAMS.DELAY_AFTER_ERROR_IN_S} s. ...`);
						await delay(LAUNCH_PARAMS.DELAY_AFTER_ERROR_IN_S);
					}
				}
			};

			const wrapPromise = (account: Account, index: number) =>
				createPromise(account, index).then(
					() => ({ status: 'fulfilled' as const }),
					(err) => ({ status: 'rejected' as const, error: err }),
				);

			const initialPromises = ACCOUNTS_TO_DO.slice(0, LAUNCH_PARAMS.NUMBER_OF_THREADS).map((a, index) =>
				wrapPromise(a, index),
			);
			const newAccounts = ACCOUNTS_TO_DO.slice(LAUNCH_PARAMS.NUMBER_OF_THREADS);
			let currentIndex = initialPromises.length - 1;

			while (newAccounts.length > 0 || initialPromises.length > 0) {
				if (initialPromises.length < LAUNCH_PARAMS.NUMBER_OF_THREADS && newAccounts.length > 0) {
					const nextAccount = newAccounts.shift();
					if (nextAccount !== undefined) {
						currentIndex++;
						initialPromises.push(wrapPromise(nextAccount, currentIndex));
					}
				}

				if (initialPromises.length > 0) {
					const finishedPromiseIndex = await Promise.race(initialPromises.map((p, index) => p.then(() => index)));
					initialPromises.splice(finishedPromiseIndex, 1);
				}
			}

			const allSuccess = ACCOUNTS_TO_DO.every((a) => successes.includes(a.name ?? ''));

			if (attemptsUntilSuccess >= LAUNCH_PARAMS.ATTEMPTS_UNTIL_SUCCESS && !allSuccess) {
				await logger.log(
					`Attempts are over. LAUNCH_PARAMS.ATTEMPTS_UNTIL_SUCCESS: ${LAUNCH_PARAMS.ATTEMPTS_UNTIL_SUCCESS}`,
					MessageType.Warn,
				);
				finish = true;
			} else if (allSuccess) {
				await logger.log(`All accounts finished in ${attemptsUntilSuccess} attempts.`, MessageType.Info);
				finish = true;
			} else {
				ACCOUNTS_TO_DO = ACCOUNTS_TO_DO.filter((a) => !successes.includes(a.name ?? ''));
				await delay(1);
			}
		}
		await logger.log(
			this.generateFinalMessage(ITERATION, successes, fails, JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)),
			MessageType.Notice,
		);
	}

	generateFinalMessage(iteration: number, successes: any[], fails: any[], actionName?: string): string {
		const message = `
		Action: ${actionName}
		Iteration: ${iteration}
		Fails (${fails.length}): ${fails.length ? fails : '-'}
		Successes (${successes.length}): ${successes.length ? successes : '-'}`;

		return message;
	}

	generateAccountMessage(index: number, totalAccounts: number, account: Account, info: string, chainId?: ChainId): string {
		const message = `${index + 1}/${totalAccounts} | ${account.name} ${chainId ? `(` + getExplorerUrl(chainId, account) + `)` : ''}: ${info}`;

		return message;
	}

	getChainIdForLog(action: Action, actionModeParams: ActionModeParams): ChainId {
		let chainId;

		if (actionModeParams.FUNCTION_PARAMS) {
			const l = Object.keys(actionModeParams.FUNCTION_PARAMS)
				.filter((k) => k.toUpperCase().includes('CHAINID'))
				.map((k) => actionModeParams.FUNCTION_PARAMS[k]);
			if (l[0]) chainId = l[0];
		}

		return chainId;
	}
}
