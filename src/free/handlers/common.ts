import { ActionName } from '@src/actions';
import { ActionModeParams, loadAccounts } from '@src/utils/actionMode';
import { generateWallets } from '@src/utils/generateWallets';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { Logger } from '@src/utils/logger';
import { checkBalances } from '@freeScenarios/checkBalances';
import { ChainId } from '@src/utils/network';
import { saveJsonAccountsToCsv } from '@src/utils/workWithSecrets';

export class CommonHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { actionParams } = params;
		switch (actionParams.action) {
			default:
				this.unsupportedAction(actionParams.action);
		}

		return { skipDelay: false };
	}

	async executeJoint(params: ActionModeParams): Promise<void> {
		const { ACCOUNTS_TO_DO, LAUNCH_PARAMS, FUNCTION_PARAMS, SECRET_STORAGE } = params;

		switch (LAUNCH_PARAMS.ACTION_PARAMS.action) {
			case ActionName.ShowWallets:
				for (const acc of ACCOUNTS_TO_DO) {
					await Logger.getInstance().log(`${acc.name}. ${JSON.stringify(acc.wallets?.evm)}`);
				}
				break;
			case ActionName.GenerateWallets:
				await generateWallets(FUNCTION_PARAMS.amount, ChainId.Ethereum);
				break;
			case ActionName.CheckBalances:
				await checkBalances(LAUNCH_PARAMS, ACCOUNTS_TO_DO, FUNCTION_PARAMS, SECRET_STORAGE.cmcApiKey);
				break;
			case ActionName.GetAccounts: {
				const accounts = await loadAccounts(LAUNCH_PARAMS, params.AES_KEY);
				const fileName = `${LAUNCH_PARAMS.JOB_ACCOUNTS[0].file}.xlsx`;
				await saveJsonAccountsToCsv(fileName, accounts);
				await Logger.getInstance().log(`${accounts.length} accs saved to ${fileName}.`);
				break;
			}
			default:
				this.unsupportedAction(params.LAUNCH_PARAMS.ACTION_PARAMS.action);
		}
	}
}
