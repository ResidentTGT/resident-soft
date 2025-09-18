import { ActionName } from '@src/actions';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { ethers } from 'ethers';

import Random from '@src/utils/random';
import { SvmApi } from '@src/free/modules/svmApi';
import { ActionModeParams } from '@src/utils/actionMode';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import { MissingFieldError } from '@src/utils/errors';
import { Logger, MessageType } from '@src/utils/logger';

export class SvmHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, network, actionParams, functionParams } = params;
		switch (actionParams.action) {
			case ActionName.SendToken: {
				if (!network) throw new Error(`Network is required for ${actionParams.action}!`);
				if (!account.wallets?.solana?.private) throw new MissingFieldError('wallets.solana.private');

				const toAddr = resolveAdresses(account, functionParams.to);
				const svmApi = new SvmApi(network);
				const walletKeyPair = await svmApi.getKeypairFromPrivate(account.wallets.solana.private);
				const balBn = await svmApi.getBalance(walletKeyPair.address, functionParams.token);

				const token = network.tokens.find((t) => t.symbol === functionParams.token);
				if (!token) throw new Error(`There is no ${functionParams.token} in network tokens!`);
				const decimals = await svmApi.getDecimals(token);
				const bal = +(await ethers.formatUnits(balBn, decimals));

				const isAmount = functionParams.amount && functionParams.amount[0] !== undefined && functionParams.amount[1];

				let amount;
				if (isAmount) {
					amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(decimals);
				} else {
					if (functionParams.minBalanceToKeep[1]) {
						const keep = Random.float(functionParams.minBalanceToKeep[0], functionParams.minBalanceToKeep[1]).toFixed(
							decimals,
						);
						amount = (bal - +keep).toFixed(decimals);
					}
				}

				if (!amount) amount = functionParams.token === network.nativeCoin ? bal - 0.00001 : bal;

				if (amount && (bal <= +amount || +amount <= 0))
					throw new Error(`Not enough balance (${bal} ${token.symbol}) to send!`);

				if (amount < functionParams.minAmountToSend) {
					await Logger.getInstance().log(
						`Balance (${bal} ${functionParams.token}) is less than minAmountToSend (${functionParams.minAmountToSend} ${token.symbol})!`,
						MessageType.Warn,
					);
					return { skipDelay: true };
				}

				if (amount && bal < +amount) throw new Error(`Not enough amount (${bal} ${token.symbol}) to send!`);
				await svmApi.transfer(account.wallets.solana.private, toAddr, +amount, functionParams.token);

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
