import { ActionName } from '@src/actions';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { withdraw } from '../modules/exchanges/exchanges';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import Random from '@src/utils/random';
import { Network } from '@src/utils/network';
import { MissingFieldError } from '@src/utils/errors';
import { Odos } from '../modules/exchanges';

export class CexDexHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, secretStorage, functionParams, actionParams } = params;
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
			case ActionName.OdosSwap: {
				const network = await Network.getNetworkByChainId(functionParams.chainId);
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
				this.unsupportedAction(params.actionParams.action);
		}
		return { skipDelay: false };
	}

	async executeJoint(): Promise<void> {
		return;
	}
}
