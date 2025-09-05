import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';

import Random from '@src/utils/random';
import { Odos } from '@freeModules/exchanges';
import { MissingFieldError } from '@src/utils/errors';

export class OdosHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, network, actionParams, functionParams } = params;
		switch (actionParams.action) {
			case ActionName.Swap: {
				if (!network) throw new Error(`Network is required for ${actionParams.action}!`);
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				const amount =
					!functionParams.amount || !functionParams.amount[1]
						? undefined
						: Random.float(functionParams.amount[0], functionParams.amount[1]).toString();
				await Odos.swap(
					account.wallets.evm.private,
					network,
					functionParams.token1,
					functionParams.token2,
					amount,
					functionParams.slippageInPercent,
					functionParams.minAmountForSwap,
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
