import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { Stargate } from '@freeModules/stargate';
import { MissingFieldError } from '@src/utils/errors';
import { Logger, MessageType } from '@src/utils/logger';
import Random from '@src/utils/random';
import { ethers } from 'ethers';
import { Evm } from '../modules/evm';
import { GasZip } from '../modules/gaszip';
import { RelayLink } from '../modules/relayLink';
import { Network } from '@src/utils/network';
import { shuffleArray } from '@src/utils/shuffleArray';

export class BridgesHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, functionParams, actionParams } = params;

		switch (actionParams.action) {
			case ActionName.Stargate: {
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
			case ActionName.RefuelGasZip: {
				const network = await Network.getNetworkByChainId(functionParams.fromChainId);
				if (!network) throw new Error(`Network is required for ${actionParams.action}!`);
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				const wal = new ethers.Wallet(account.wallets.evm.private);
				const bal = +ethers.formatEther(await Evm.getBalance(network, wal.address, network.nativeCoin));

				const isAmount = functionParams.amount && functionParams.amount[0] !== undefined && functionParams.amount[1];

				let amount;
				if (isAmount) {
					amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(6);
				} else {
					if (functionParams.minBalanceToKeep[1]) {
						const keep = Random.float(functionParams.minBalanceToKeep[0], functionParams.minBalanceToKeep[1]).toFixed(
							18,
						);
						amount = (bal - +keep).toFixed(6);
					}
				}

				if (!amount) amount = (bal - 0.00001).toFixed(6);

				if (bal <= +amount || +amount <= 0)
					throw new Error(`Not enough balance (${bal} ${network.nativeCoin}) to refuel!`);

				if (amount < functionParams.minAmountToSend) {
					await Logger.getInstance().log(
						`Balance (${bal} ${network.nativeCoin}) is less than minAmountToSend (${functionParams.minAmountToSend} ${network.nativeCoin})!`,
						MessageType.Warn,
					);
					return { skipDelay: true };
				}

				await GasZip.refuel(account.wallets.evm.private, network, functionParams.toChainIds, wal.address, amount);

				break;
			}
			case ActionName.RefuelRelayLink: {
				const network = await Network.getNetworkByChainId(functionParams.fromChainId);
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				const wal = new ethers.Wallet(account.wallets.evm.private);
				const bal = +ethers.formatEther(await Evm.getBalance(network, wal.address, network.nativeCoin));

				const isAmount = functionParams.amount && functionParams.amount[0] !== undefined && functionParams.amount[1];

				let amount;
				if (isAmount) {
					amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(6);
				} else {
					if (functionParams.minBalanceToKeep[1]) {
						const keep = Random.float(functionParams.minBalanceToKeep[0], functionParams.minBalanceToKeep[1]).toFixed(
							18,
						);
						amount = (bal - +keep).toFixed(6);
					}
				}

				if (!amount) amount = (bal - 0.00001).toFixed(6);

				if (amount < functionParams.minAmountToSend) {
					await Logger.getInstance().log(
						`Balance (${bal} ${network.nativeCoin}) is less than minAmountToSend (${functionParams.minAmountToSend} ${network.nativeCoin})!`,
						MessageType.Warn,
					);
					return { skipDelay: true };
				}

				if (bal <= +amount || +amount <= 0)
					throw new Error(`Not enough balance (${bal} ${network.nativeCoin}) to refuel!`);

				let destAddr;
				if (Network.isEvm(functionParams.toChainId)) {
					if (!account.wallets?.evm?.address) throw new MissingFieldError('wallets.evm.address');
					destAddr = account.wallets.evm.address;
				}
				if (Network.isSvm(functionParams.toChainId)) {
					if (!account.wallets?.solana?.address) throw new MissingFieldError('wallets.solana.address');
					destAddr = account.wallets.solana.address;
				}
				if (!destAddr) throw new Error('There is no destination address!');

				await RelayLink.refuel(account.wallets.evm.private, network, functionParams.toChainId, amount, destAddr);

				break;
			}
			default:
				this.unsupportedAction(actionParams.action);
		}

		return { skipDelay: false };
	}

	async executeJoint(params: ActionModeParams): Promise<void> {
		const { ACCOUNTS_TO_DO, LAUNCH_PARAMS, FUNCTION_PARAMS, SECRET_STORAGE } = params;

		switch (LAUNCH_PARAMS.ACTION_PARAMS.action) {
			case ActionName.RefuelManyGasZip: {
				const network = await Network.getNetworkByChainId(FUNCTION_PARAMS.fromChainId);
				if (!SECRET_STORAGE.mainEvmWallet?.private) throw new Error('SECRET_STORAGE.mainEvmWallet.private is required!');
				await GasZip.refuelManyWalletsFromOneWallet(
					SECRET_STORAGE.mainEvmWallet.private,
					network,
					FUNCTION_PARAMS.toChainIds,
					LAUNCH_PARAMS.SHUFFLE_ACCOUNTS ? shuffleArray(FUNCTION_PARAMS.addresses) : FUNCTION_PARAMS.addresses,
					FUNCTION_PARAMS.amount,
					LAUNCH_PARAMS.DELAY_BETWEEN_ACCS_IN_S,
				);
				break;
			}
			case ActionName.RefuelManyRelayLink: {
				const network = await Network.getNetworkByChainId(FUNCTION_PARAMS.fromChainId);
				if (!SECRET_STORAGE.mainEvmWallet?.private) throw new Error('SECRET_STORAGE.mainEvmWallet.private is required!');
				await RelayLink.refuelManyWalletsFromOneWallet(
					SECRET_STORAGE.mainEvmWallet.private,
					network,
					FUNCTION_PARAMS.toChainId,
					LAUNCH_PARAMS.SHUFFLE_ACCOUNTS ? shuffleArray(FUNCTION_PARAMS.addresses) : FUNCTION_PARAMS.addresses,
					FUNCTION_PARAMS.amount,
					LAUNCH_PARAMS.DELAY_BETWEEN_ACCS_IN_S,
				);
				break;
			}
			default:
				this.unsupportedAction(params.LAUNCH_PARAMS.ACTION_PARAMS.action);
		}
	}
}
