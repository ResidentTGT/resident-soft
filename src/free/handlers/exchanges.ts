import { ActionName } from '@src/actions';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { withdraw } from '../modules/exchanges/exchanges';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import Random from '@src/utils/random';

export class ExchangesHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, secretStorage, functionParams } = params;
		switch (params.actionParams.action) {
			case ActionName.Withdraw: {
				const to = resolveAdresses(account, functionParams.to);

				if (!functionParams.amount || !functionParams.amount[0] || !functionParams.amount[1])
					throw new Error('Amount is required!');
				const amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(6);

				await withdraw(
					secretStorage,
					functionParams.exchanges,
					to,
					functionParams.token,
					functionParams.toChainId,
					+amount,
				);

				break;
			}
			default:
				this.unsupportedAction(params.actionParams.action);
		}
		return { skipDelay: false };
	}

	async executeJoint(): Promise<void> {
		return;
	}
}
