import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { checkLinea } from '../scenarios/checkers';

export class CheckersHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, network, actionParams, functionParams } = params;

		switch (actionParams.action) {
			case ActionName.TEST:
				break;
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
