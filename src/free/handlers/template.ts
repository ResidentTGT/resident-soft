import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';

export class TemplateHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		switch (params.actionParams.action) {
			case ActionName.TEST:
				break;
			default:
				this.unsupportedAction(params.actionParams.action);
		}
		return { skipDelay: false };
	}

	async executeJoint(params: ActionModeParams): Promise<void> {
		switch (params.LAUNCH_PARAMS.ACTION_PARAMS.action) {
			case ActionName.TEST:
				break;
			default:
				this.unsupportedAction(params.LAUNCH_PARAMS.ACTION_PARAMS.action);
		}
	}
}
