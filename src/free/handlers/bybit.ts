import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';

import Random from '@src/utils/random';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import { MissingFieldError } from '@src/utils/errors';
import { Bybit } from '../modules/exchanges/bybit/bybit';

export class BybitHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, secretStorage, actionParams, functionParams } = params;
		switch (actionParams.action) {
			case ActionName.Withdraw: {
				if (!secretStorage.mainBybitAccount) throw new MissingFieldError('mainBybitAccount', false);
				const to = resolveAdresses(account, functionParams.to);

				if (!functionParams.amount || !functionParams.amount[1]) throw new Error('amount is required');
				const amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(6);
				await new Bybit(secretStorage.mainBybitAccount).withdraw(
					to,
					functionParams.token,
					+amount,
					functionParams.toChainId,
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
