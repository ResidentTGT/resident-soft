import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';

import Random from '@src/utils/random';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import { binanceWithdraw } from '@freeModules/exchanges/binance/withdraw';
import { MissingFieldError } from '@src/utils/errors';

export class BinanceHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, secretStorage, actionParams, functionParams } = params;
		switch (actionParams.action) {
			case ActionName.Withdraw: {
				if (!secretStorage.mainBinanceAccount?.api) throw new MissingFieldError('mainBinanceAccount.api', false);
				const to = resolveAdresses(account, functionParams.to);

				if (!functionParams.amount || !functionParams.amount[1]) throw new Error('amount is required');
				const amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(8);

				await binanceWithdraw(
					functionParams.token,
					to,
					functionParams.toChainId,
					secretStorage.mainBinanceAccount.api,
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
