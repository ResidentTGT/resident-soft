import { delay } from '@src/utils/delay';
import { Logger, MessageType } from '@src/utils/logger';
import Random from '@src/utils/random';
import { getStandardState } from '@src/utils/state';
import { getCurrentStateName } from '@src/utils/stateManager';
import { checkTaskCancellation } from '@src/utils/taskExecutor';
import { GasZip } from '../modules/gaszip';
import { ChainId, Network } from '@src/utils/network';
import { RelayLink } from '../modules/relayLink';

export enum RefuelService {
	GasZip = 'GasZip',
	RelayLink = 'RelayLink',
}

export async function refuelFromOneToMany(
	fromPrivateKey: string,
	network: Network,
	toChainId: ChainId,
	toAddrs: string[],
	amount: number[], // [1,2]
	delayBetweenAccs: number[], //[1,2]
	service: RefuelService,
): Promise<any> {
	const refuelState = `refuelManyWalletsFromOneWallet/${new Date().toISOString().split('.')[0].replaceAll(':', '-')}`;
	const taskState = getCurrentStateName();
	for (let i = 0; i < toAddrs.length; i++) {
		if (taskState) {
			try {
				checkTaskCancellation(taskState);
			} catch (e: any) {
				saveStateInfo(taskState, refuelState);
				throw e;
			}
		}
		try {
			await Logger.getInstance().log(`Starting ${i + 1} of ${toAddrs.length} ...`);

			switch (service) {
				case RefuelService.GasZip:
					await GasZip.refuel(
						fromPrivateKey,
						network,
						[toChainId],
						toAddrs[i],
						Random.float(amount[0], amount[1]).toFixed(6),
					);
					break;
				case RefuelService.RelayLink:
					await RelayLink.refuel(
						fromPrivateKey,
						network,
						toChainId,
						Random.float(amount[0], amount[1]).toFixed(6),
						toAddrs[i],
					);
					break;
			}

			const STATE = getStandardState(refuelState);
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
			const STATE = getStandardState(refuelState);
			if (!STATE.fails.includes(toAddrs[i])) {
				STATE.fails.push(toAddrs[i]);
				STATE.save();
			}
			await delay(5);
		}
	}
	if (taskState) {
		saveStateInfo(taskState, refuelState);
	}
}

function saveStateInfo(taskState: string, refuelState: string) {
	const STATE = getStandardState(taskState);
	const REFUEL_STATE = getStandardState(refuelState);
	STATE.info = `\nУспешно: ${REFUEL_STATE.successes.length}\n${REFUEL_STATE.successes.join('\n')}\n\nОшибки: ${REFUEL_STATE.fails.length}\n${REFUEL_STATE.fails.join('\n')}`;
	STATE.save();
}
