import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';

import Random from '@src/utils/random';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import { Bitget } from '@freeModules/exchanges/bitget/bitget';
import { MissingFieldError } from '@src/utils/errors';

export class BitgetHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, secretStorage, actionParams, functionParams } = params;
		switch (actionParams.action) {
			case ActionName.Withdraw: {
				if (!secretStorage.mainBitgetAccount) throw new MissingFieldError('mainBitgetAccount', false);
				const to = resolveAdresses(account, functionParams.to);

				if (!functionParams.amount || !functionParams.amount[1]) throw new Error('amount is required');
				const amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(6);
				await new Bitget(secretStorage.mainBitgetAccount).withdraw(
					to,
					functionParams.token,
					false,
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
