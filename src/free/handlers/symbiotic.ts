import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { Symbiotic } from '../modules/symbiotic';

export class SymbioticHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		switch (params.actionParams.action) {
			case ActionName.Withdraw:
				await Symbiotic.withdraw(params.account, params.functionParams.chainId, params.functionParams.vaultAddr);
				break;
			default:
				this.unsupportedAction(params.actionParams.action);
		}
		return { skipDelay: false };
	}

	async executeJoint(params: ActionModeParams): Promise<void> {
		return;
	}
}
