import { delay } from '@src/utils/delay';
import { Logger, MessageType } from '@src/utils/logger';
import Random from '@src/utils/random';
import { getStandardState } from '@src/utils/state';
import { getCurrentStateName } from '@src/utils/stateManager';
import { checkTaskCancellation } from '@src/utils/taskExecutor';
import { ChainId, Network } from '@src/utils/network';
import { SvmApi } from '@src/free/modules/svmApi';

export async function sendTokenFromOneToMany(
	fromPrivateKey: string,
	chainId: ChainId,
	tokenSymbol: string,
	toAddrs: string[],
	amount: number[], // [1,2]
	delayBetweenAccs: number[], //[1,2]
): Promise<any> {
	const sendState = `sendTokenToManyWalletsFromOneWallet/${new Date().toISOString().split('.')[0].replaceAll(':', '-')}`;
	const taskState = getCurrentStateName();
	for (let i = 0; i < toAddrs.length; i++) {
		if (taskState) {
			try {
				checkTaskCancellation(taskState);
			} catch (e: any) {
				saveStateInfo(taskState, sendState);
				throw e;
			}
		}
		try {
			await Logger.getInstance().log(`Starting ${i + 1} of ${toAddrs.length} ...`);

			const amountToSend = Random.float(amount[0], amount[1]);
			const network = await Network.getNetworkByChainId(chainId);
			const svmApi = new SvmApi(network);
			await svmApi.transfer(fromPrivateKey, toAddrs[i], +amountToSend, tokenSymbol);

			const STATE = getStandardState(sendState);
			STATE.successes.push(toAddrs[i]);
			STATE.fails = STATE.fails.filter((f: string) => f !== toAddrs[i]);
			STATE.save();

			if (delayBetweenAccs[1] && i !== toAddrs.length - 1) {
				const waiting = Random.int(delayBetweenAccs[0], delayBetweenAccs[1]);
				await Logger.getInstance().log(`Waiting ${waiting} s. ...`);
				await delay(waiting);
			}
		} catch (e) {
			await Logger.getInstance().log(`Error: ${e}`, MessageType.Error);
			const STATE = getStandardState(sendState);
			if (!STATE.fails.includes(toAddrs[i])) {
				STATE.fails.push(toAddrs[i]);
				STATE.save();
			}
			await delay(5);
		}
	}
	if (taskState) {
		saveStateInfo(taskState, sendState);
	}
}

function saveStateInfo(taskState: string, sendState: string) {
	const STATE = getStandardState(taskState);
	const REFUEL_STATE = getStandardState(sendState);
	STATE.info = `\nУспешно: ${REFUEL_STATE.successes.length}\n${REFUEL_STATE.successes.join('\n')}\n\nОшибки: ${REFUEL_STATE.fails.length}\n${REFUEL_STATE.fails.join('\n')}`;
	STATE.save();
}
