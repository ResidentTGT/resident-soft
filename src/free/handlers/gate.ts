import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';

import Random from '@src/utils/random';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import { Gate } from '@freeModules/exchanges/gate';
import { MissingFieldError } from '@src/utils/errors';

export class GateHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, secretStorage, actionParams, functionParams } = params;
		switch (actionParams.action) {
			case ActionName.Withdraw: {
				if (!secretStorage.mainGateAccount) throw new MissingFieldError('mainGateAccount', false);
				const to = resolveAdresses(account, functionParams.to);

				if (!functionParams.amount || !functionParams.amount[1]) throw new Error('amount is required');
				const amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(6);
				await new Gate(secretStorage.mainGateAccount).withdraw(
					to,
					functionParams.token,
					functionParams.toChainId,
					+amount,
				);
				break;
			}
			default:
				this.unsupportedAction(actionParams.action);
		}
		return { skipDelay: false };
	}

	async executeJoint(params: ActionModeParams): Promise<void> {
		return;
	}
}
