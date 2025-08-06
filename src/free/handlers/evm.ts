import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { Evm } from '@src/free/modules/evm';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { ethers } from 'ethers';
import { ChainId } from '@src/utils/network';

import Random from '@src/utils/random';
import { Evmscan } from '@freeModules/evmscan';
import { checkNft } from '@freeScenarios/evm';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import { MissingFieldError } from '@src/utils/errors';

export class EvmHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, secretStorage, network, actionParams, functionParams } = params;
		switch (actionParams.action) {
			case ActionName.SendToken: {
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				const toAddr = resolveAdresses(account, functionParams.to);

				const token = network.tokens.find((t) => t.symbol === functionParams.token);
				if (!token) throw new Error(`No ${functionParams.token} in ${network.name} tokens`);

				const decimals = await Evm.getDecimals(network, token);
				const amount =
					!functionParams.amount || !functionParams.amount[1]
						? undefined
						: Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(decimals);

				const wallet = new ethers.Wallet(account.wallets.evm.private);
				const bal = +ethers.formatUnits(await Evm.getBalance(network, wallet.address, token.symbol), decimals);

				if (amount && bal <= +amount) throw new Error(`Not enough amount (${bal} ${token.symbol}) to send!`);

				if (functionParams.token === network.nativeCoin)
					await Evm.sendNative(account.wallets.evm.private, network, toAddr, amount);
				else await Evm.sendToken(account.wallets.evm.private, network, toAddr, functionParams.token, amount);

				break;
			}

			case ActionName.CheckTransactions: {
				if (!secretStorage.etherscanApiKey) throw new Error('secretStorage.etherscanApiKey is required!');
				if (!account.wallets?.evm?.address) throw new MissingFieldError('wallets.evm.address');
				const scan = new Evmscan(secretStorage.etherscanApiKey, ChainId.Ethereum);
				const txs = await scan.getTransactions({
					address: account.wallets.evm.address,
					functionName: 'deposit',
					success: true,
					to: '0xB26ff591F44b04E78de18f43B46f8b70C6676984',
				});
				if (!txs.length) throw new Error();
				break;
			}

			case ActionName.Wrap: {
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				if (!functionParams.amount || !functionParams.amount[1]) throw new Error('amount is required');
				const amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(18);
				await Evm.wrap(network, account.wallets.evm.private, amount);
				break;
			}
			case ActionName.Unwrap: {
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				const amount =
					!functionParams.amount || !functionParams.amount[1]
						? undefined
						: Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(18);
				await Evm.unwrap(network, account.wallets.evm.private, amount);
				break;
			}
			case ActionName.Approve: {
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				if (!functionParams.amount || !functionParams.amount[1]) throw new Error('amount is required');
				const amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toString();
				await Evm.approve(
					network,
					account.wallets.evm.private,
					functionParams.spender,
					functionParams.tokenSymbol,
					amount,
				);
				break;
			}
			case ActionName.MakeTransaction:
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				await Evm.generateAndMakeTransaction(
					network.getProvider(),
					account.wallets.evm.private,
					functionParams.contractAddress,
					ethers.parseEther(functionParams.value.toString()),
					functionParams.data,
				);
				break;
			default:
				this.unsupportedAction(actionParams.action);
		}
		return { skipDelay: false };
	}

	async executeJoint(params: ActionModeParams): Promise<void> {
		switch (params.LAUNCH_PARAMS.ACTION_PARAMS.action) {
			case ActionName.CheckNft:
				await checkNft(params.ACCOUNTS_TO_DO, params.LAUNCH_PARAMS.CHAIN_ID, params.FUNCTION_PARAMS.nftContract);
				break;
			default:
				this.unsupportedAction(params.LAUNCH_PARAMS.ACTION_PARAMS.action);
		}
	}
}
