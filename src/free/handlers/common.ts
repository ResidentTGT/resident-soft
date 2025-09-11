import { ActionName } from '@src/actions';
import { ActionModeParams } from '@src/utils/actionMode';
import { Evm } from '@src/free/modules/evm';
import { generateWallets } from '@src/utils/generateWallets';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { Logger, MessageType } from '@src/utils/logger';
import Random from '@src/utils/random';
import { ethers } from 'ethers';
import { GasZip } from '@freeModules/gaszip';
import { RelayLink } from '@freeModules/relayLink';
import { checkBalances } from '@freeScenarios/checkBalances';
import { Network } from '@src/utils/network';
import { MissingFieldError } from '@src/utils/errors';

export class CommonHandler extends BaseHandler {
	async executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }> {
		const { account, network, actionParams, functionParams } = params;
		switch (actionParams.action) {
			case ActionName.RefuelGasZip: {
				if (!network) throw new Error(`Network is required for ${actionParams.action}!`);
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				const wal = new ethers.Wallet(account.wallets.evm.private);
				const bal = +ethers.formatEther(await Evm.getBalance(network, wal.address, network.nativeCoin));
				const amount =
					!functionParams.amount || !functionParams.amount[1]
						? bal - 0.00001
						: Random.float(functionParams.amount[0], functionParams.amount[1]);
				if (amount > 0 && bal > amount)
					await GasZip.refuel(
						account.wallets.evm.private,
						network,
						functionParams.toChainIds,
						wal.address,
						amount.toFixed(6),
					);
				else {
					await Logger.getInstance().log(`No funds (${bal} ${network.nativeCoin}) to refuel!`, MessageType.Warn);
					return { skipDelay: true };
				}
				//return {};
				break;
			}
			case ActionName.RefuelRelayLink: {
				if (!network) throw new Error(`Network is required for ${actionParams.action}!`);
				if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
				const wal = new ethers.Wallet(account.wallets.evm.private);
				const bal = +ethers.formatEther(await Evm.getBalance(network, wal.address, network.nativeCoin));
				const amount =
					!functionParams.amount || !functionParams.amount[1]
						? bal - 0.00001
						: Random.float(functionParams.amount[0], functionParams.amount[1]);
				if (amount > 0 && bal > amount) {
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
					await RelayLink.refuel(
						account.wallets.evm.private,
						network,
						functionParams.toChainId,
						amount.toFixed(6),
						destAddr,
					);
				} else {
					await Logger.getInstance().log(`No funds (${bal} ${network.nativeCoin}) to refuel!`, MessageType.Warn);
					return { skipDelay: true };
				}
				break;
			}

			default:
				this.unsupportedAction(actionParams.action);
		}

		return { skipDelay: false };
	}

	async executeJoint(params: ActionModeParams): Promise<void> {
		const { ACCOUNTS_TO_DO, LAUNCH_PARAMS, FUNCTION_PARAMS, SECRET_STORAGE } = params;

		const network = await Network.getNetworkByChainId(LAUNCH_PARAMS.CHAIN_ID);
		switch (LAUNCH_PARAMS.ACTION_PARAMS.action) {
			case ActionName.ShowWallets:
				for (const acc of ACCOUNTS_TO_DO) {
					await Logger.getInstance().log(`${acc.name}. ${JSON.stringify(acc.wallets?.evm)}`);
				}
				break;
			case ActionName.GenerateWallets:
				await generateWallets(FUNCTION_PARAMS.amount, LAUNCH_PARAMS.CHAIN_ID);
				break;
			case ActionName.RefuelManyGasZip:
				if (!SECRET_STORAGE.mainEvmWallet?.private) throw new Error('SECRET_STORAGE.mainEvmWallet.private is required!');
				await GasZip.refuelManyWalletsFromOneWallet(
					SECRET_STORAGE.mainEvmWallet.private,
					network,
					FUNCTION_PARAMS.toChainIds,
					LAUNCH_PARAMS.SHUFFLE_ACCOUNTS ? FUNCTION_PARAMS.addresses.shuffle() : FUNCTION_PARAMS.addresses,
					FUNCTION_PARAMS.amount,
					LAUNCH_PARAMS.DELAY_BETWEEN_ACCS_IN_S,
				);
				break;
			case ActionName.RefuelManyRelayLink:
				if (!SECRET_STORAGE.mainEvmWallet?.private) throw new Error('SECRET_STORAGE.mainEvmWallet.private is required!');
				await RelayLink.refuelManyWalletsFromOneWallet(
					SECRET_STORAGE.mainEvmWallet.private,
					network,
					FUNCTION_PARAMS.toChainId,
					LAUNCH_PARAMS.SHUFFLE_ACCOUNTS ? FUNCTION_PARAMS.addresses.shuffle() : FUNCTION_PARAMS.addresses,
					FUNCTION_PARAMS.amount,
					LAUNCH_PARAMS.DELAY_BETWEEN_ACCS_IN_S,
				);
				break;
			case ActionName.CheckBalances:
				await checkBalances(ACCOUNTS_TO_DO, FUNCTION_PARAMS, SECRET_STORAGE.cmcApiKey);
				break;
			default:
				this.unsupportedAction(params.LAUNCH_PARAMS.ACTION_PARAMS.action);
		}
	}
}
