import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { checkLinea, claimLinea } from '../scenarios/checkers';
import { ChainId, Network } from '@src/utils/network';

export class CheckersHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, actionParams, functionParams } = params;

		switch (actionParams.action) {
			case ActionName.Claim: {
				const network = await Network.getNetworkByChainId(ChainId.Linea);
				if (!network) throw new Error(`Network is required for ${actionParams.action}!`);
				await claimLinea(account, network);
				break;
			}
			default:
				this.unsupportedAction(actionParams.action);
		}
		return { skipDelay: false };
	}

	async executeJoint(params: ActionModeParams): Promise<void> {
		switch (params.LAUNCH_PARAMS.ACTION_PARAMS.action) {
			case ActionName.Linea:
				await checkLinea(params.ACCOUNTS_TO_DO);
				break;
			default:
				this.unsupportedAction(params.LAUNCH_PARAMS.ACTION_PARAMS.action);
		}
	}
}
