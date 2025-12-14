import { ActionModeParams } from '@utils/actionMode';
import { Account } from '@utils/account';
import { ChainId } from '@utils/network';
import { SecretStorage } from '@utils/secretStorage.type';
import type { Action, ActionParams } from '@src/actions';
import { ActionName, ACTIONS, ActionsGroupName } from '@src/actions';
import { delay } from './delay';
import { Logger, MessageType } from './logger';
import Random from './random';
import { rotateProxy } from './rotateProxy';
import { setProxy } from './setProxy';
import { getStandardState } from './state';
import { getExplorerUrl } from './getExplorerUrl';
import { getCurrentStateName } from './stateManager';
import { checkTaskCancellation } from './taskExecutor';

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

interface AccountExecutionResult {
	status: 'fulfilled' | 'rejected';
	error?: Error;
}

interface ExecutionState {
	successes: string[];
	fails: string[];
}

export abstract class BaseHandler implements Handler {
	public group: ActionsGroupName;

	constructor(group: ActionsGroupName) {
		this.group = group;
	}

	abstract executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }>;

	abstract executeJoint(params: ActionModeParams): Promise<void>;

	unsupportedAction(action: ActionName) {
		throw new Error(`Unsupported ${this.group} action: ${action}`);
	}

	/**
	 * Validates that the action exists in the actions registry
	 */
	private validateAction(actionParams: ActionParams): Action {
		const group = ACTIONS.find((g) => g.group === actionParams.group);
		const action = group?.actions.find((a) => a.action === actionParams.action);

		if (!action) {
			throw new Error(`Action doesn't exist: ${JSON.stringify(actionParams)}`);
		}

		return action;
	}

	/**
	 * Sets up proxy for account if configured
	 */
	private async setupProxy(account: Account, launchParams: ActionModeParams['LAUNCH_PARAMS']): Promise<void> {
		if (!launchParams.PROXY || !account.proxy) {
			return;
		}

		if (launchParams.ROTATE_PROXY && account.proxy.rotateUrl) {
			await rotateProxy(account.proxy.rotateUrl);
		} else if (!launchParams.ROTATE_PROXY) {
			await setProxy(account.proxy);
		}
	}

	/**
	 * Handles successful account execution
	 */
	private handleAccountSuccess(accountName: string, state: ExecutionState, stateName: string): void {
		state.successes.push(accountName);
		state.fails = state.fails.filter((f) => f !== accountName);

		const STATE = getStandardState(stateName);
		STATE.successes.push(accountName);
		STATE.fails = STATE.fails.filter((f: string) => f !== accountName);
		STATE.save();
	}

	/**
	 * Handles failed account execution
	 */
	private handleAccountError(accountName: string, state: ExecutionState, stateName: string): void {
		if (!state.fails.includes(accountName)) {
			state.fails.push(accountName);
		}

		const STATE = getStandardState(stateName);
		if (!STATE.fails.includes(accountName)) {
			STATE.fails.push(accountName);
			STATE.save();
		}
	}

	/**
	 * Logs account status message
	 */
	private async logAccountStatus(
		logger: Logger,
		index: number,
		totalAccounts: number,
		account: Account,
		status: string,
		action: Action,
		actionModeParams: ActionModeParams,
		messageType: MessageType = MessageType.Info,
	): Promise<void> {
		const message = this.generateAccountMessage(
			index,
			totalAccounts,
			account,
			status,
			this.getChainIdForLog(action, actionModeParams),
		);
		await logger.log(message, messageType);
	}

	/**
	 * Handles delay between account executions
	 */
	private async handleAccountDelay(
		logger: Logger,
		delayRange: number[],
		index: number,
		totalAccounts: number,
		skipDelay?: boolean,
	): Promise<void> {
		if (!delayRange[1] || index === totalAccounts - 1 || skipDelay) {
			return;
		}

		const waitingTime = Random.int(delayRange[0], delayRange[1]);
		await logger.log(`Waiting ${waitingTime} s. ...`);
		await delay(waitingTime);
	}

	/**
	 * Handles delay after error
	 */
	private async handleErrorDelay(logger: Logger, delayInSeconds: number): Promise<void> {
		if (delayInSeconds > 0) {
			await logger.log(`Waiting ${delayInSeconds} s. ...`);
			await delay(delayInSeconds);
		}
	}

	/**
	 * Executes action for a single account
	 */
	private async executeAccountAction(
		account: Account,
		index: number,
		totalAccounts: number,
		action: Action,
		actionModeParams: ActionModeParams,
		state: ExecutionState,
		logger: Logger,
	): Promise<void> {
		const { LAUNCH_PARAMS, FUNCTION_PARAMS, SECRET_STORAGE, AES_KEY } = actionModeParams;
		const accountName = account.name ?? '';

		try {
			await this.logAccountStatus(logger, index, totalAccounts, account, 'started', action, actionModeParams);

			await this.setupProxy(account, LAUNCH_PARAMS);

			const result = await this.executeIsolated({
				account,
				secretStorage: SECRET_STORAGE,
				aesKey: AES_KEY,
				actionParams: LAUNCH_PARAMS.ACTION_PARAMS,
				functionParams: FUNCTION_PARAMS,
			});

			this.handleAccountSuccess(accountName, state, LAUNCH_PARAMS.STATE_NAME);

			await this.logAccountStatus(logger, index, totalAccounts, account, 'finished', action, actionModeParams);

			await this.handleAccountDelay(logger, LAUNCH_PARAMS.DELAY_BETWEEN_ACCS_IN_S, index, totalAccounts, result?.skipDelay);
		} catch (err: unknown) {
			this.handleAccountError(accountName, state, LAUNCH_PARAMS.STATE_NAME);

			const error = err as Error;
			const errorMessage = `\nAction: ${JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)}\n${error.stack ?? error.message}`;

			await this.logAccountStatus(
				logger,
				index,
				totalAccounts,
				account,
				errorMessage,
				action,
				actionModeParams,
				MessageType.Error,
			);

			await this.handleErrorDelay(logger, LAUNCH_PARAMS.DELAY_AFTER_ERROR_IN_S);
		}
	}

	/**
	 * Wraps account execution in a promise that never rejects
	 */
	private wrapAccountExecution(
		account: Account,
		index: number,
		totalAccounts: number,
		action: Action,
		actionModeParams: ActionModeParams,
		state: ExecutionState,
		logger: Logger,
	): Promise<AccountExecutionResult> {
		return this.executeAccountAction(account, index, totalAccounts, action, actionModeParams, state, logger).then(
			() => ({ status: 'fulfilled' as const }),
			(error) => ({ status: 'rejected' as const, error }),
		);
	}

	/**
	 * Processes accounts with thread pool management
	 */
	private async processAccountsWithThreadPool(
		accounts: Account[],
		maxThreads: number,
		action: Action,
		actionModeParams: ActionModeParams,
		state: ExecutionState,
		logger: Logger,
	): Promise<void> {
		const accountPromises = accounts
			.slice(0, maxThreads)
			.map((account, index) =>
				this.wrapAccountExecution(account, index, accounts.length, action, actionModeParams, state, logger),
			);

		const remainingAccounts = accounts.slice(maxThreads);
		let currentIndex = accountPromises.length - 1;

		while (remainingAccounts.length > 0 || accountPromises.length > 0) {
			const stateName = getCurrentStateName();
			if (stateName) {
				checkTaskCancellation(stateName);
			}

			if (accountPromises.length < maxThreads && remainingAccounts.length > 0) {
				const nextAccount = remainingAccounts.shift();
				if (nextAccount) {
					currentIndex++;
					accountPromises.push(
						this.wrapAccountExecution(
							nextAccount,
							currentIndex,
							accounts.length,
							action,
							actionModeParams,
							state,
							logger,
						),
					);
				}
			}

			// Wait for any promise to complete and remove it
			if (accountPromises.length > 0) {
				const finishedIndex = await Promise.race(accountPromises.map((p, idx) => p.then(() => idx)));
				accountPromises.splice(finishedIndex, 1);
			}
		}
	}

	async actionIsolated(actionModeParams: ActionModeParams): Promise<void> {
		const { LAUNCH_PARAMS, ITERATION } = actionModeParams;
		const logger = Logger.getInstance();
		const action = this.validateAction(LAUNCH_PARAMS.ACTION_PARAMS);

		let accountsToProcess = actionModeParams.ACCOUNTS_TO_DO.slice();
		const state: ExecutionState = { successes: [], fails: [] };

		let attemptNumber = 0;
		let shouldContinue = true;

		while (shouldContinue && attemptNumber < LAUNCH_PARAMS.ATTEMPTS_UNTIL_SUCCESS) {
			attemptNumber++;

			await logger.log(
				`Iteration ${ITERATION}. Attempt ${attemptNumber}. Accounts (${accountsToProcess.length}): ${accountsToProcess.map((a) => a.name).join(',')}\n`,
				MessageType.Info,
			);

			await this.processAccountsWithThreadPool(
				accountsToProcess,
				LAUNCH_PARAMS.NUMBER_OF_THREADS,
				action,
				actionModeParams,
				state,
				logger,
			);

			const allAccountsSucceeded = accountsToProcess.every((a) => state.successes.includes(a.name ?? ''));

			if (attemptNumber >= LAUNCH_PARAMS.ATTEMPTS_UNTIL_SUCCESS && !allAccountsSucceeded) {
				await logger.log(
					`Attempts are over. LAUNCH_PARAMS.ATTEMPTS_UNTIL_SUCCESS: ${LAUNCH_PARAMS.ATTEMPTS_UNTIL_SUCCESS}`,
					MessageType.Warn,
				);
				shouldContinue = false;
			} else if (allAccountsSucceeded) {
				await logger.log(`All accounts finished in ${attemptNumber} attempts.`, MessageType.Info);
				shouldContinue = false;
			} else {
				accountsToProcess = accountsToProcess.filter((a) => !state.successes.includes(a.name ?? ''));
				await delay(1);
			}
		}

		await logger.log(
			this.generateFinalMessage(ITERATION, state.successes, state.fails, JSON.stringify(LAUNCH_PARAMS.ACTION_PARAMS)),
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

			if (l[0] && typeof l[0] === 'string') chainId = l[0];
		}

		return chainId as ChainId;
	}
}
