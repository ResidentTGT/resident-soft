import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { Stargate } from '@freeModules/stargate';

export class StargateHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, functionParams, actionParams } = params;

		switch (actionParams.action) {
			case ActionName.Bridge: {
				await Stargate.bridge(
					account,
					functionParams.fromChainId,
					functionParams.fromToken,
					functionParams.toChainId,
					functionParams.toToken,
					functionParams.amount,
					functionParams.minBalanceToKeep,
					functionParams.minAmountToBridge,
					functionParams.slippagePercent,
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
