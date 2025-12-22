import { ethers } from 'ethers';
import { Logger, MessageType } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';
import axios from 'axios';
import { delay } from '@utils/delay';
import Random from '@utils/random';
import { getStandardState } from '@utils/state';
import { getCurrentStateName } from '@src/utils/stateManager';
import { checkTaskCancellation } from '@src/utils/taskExecutor';

//https://docs.relay.link/resources/supported-chains

export abstract class RelayLink {
	static async refuel(privateKey: string, network: Network, toChainId: ChainId, amount: string, to: string) {
		const wallet = new ethers.Wallet(privateKey);

		await Logger.getInstance().log(`Start bridging ${amount} ${network.nativeCoin} to ${toChainId} to ${to} ...`);

		const destintaionChain = await this._getRelayChain(toChainId);
		const sourceChain = await this._getRelayChain(network.chainId);

		const body = {
			user: wallet.address,
			recipient: to,
			originChainId: sourceChain.id,
			destinationChainId: destintaionChain.id,
			originCurrency: sourceChain.currency.address,
			destinationCurrency: destintaionChain.currency.address,
			tradeType: 'EXACT_INPUT',
			// useDepositAddress: false,
			// useExternalLiquidity: false,
			// topupGas: false,
			amount: ethers.parseEther(amount).toString(),
			referrer: 'relay.link',
		};
		try {
			const trData = (await axios.post('https://api.relay.link/quote', body)).data.steps[0].items[0].data;

			const provider = network.getProvider();
			const transaction = await Evm.generateTransactionRequest(
				provider,
				privateKey,
				trData.to,
				BigInt(trData.value),
				trData.data,
			);

			await Evm.makeTransaction(provider, privateKey, transaction);

			await Logger.getInstance().log(`Bridged.`);
		} catch (e: any) {
			const errorMsg = e.response?.data?.message;
			throw new Error(`Refuel ${amount} ${network.nativeCoin} to ${to} failed.\n${errorMsg ?? e}`);
		}
	}

	static async refuelManyWalletsFromOneWallet(
		fromPrivateKey: string,
		network: Network,
		toChainId: ChainId,
		toAddrs: string[],
		value: number[], // [1,2]
		delayBetweenAccs: number[], //[1,2]
	): Promise<any> {
		const stateName = `refuelManyWalletsFromOneWallet/${new Date().toISOString().split('.')[0].replaceAll(':', '-')}`;
		for (let i = 0; i < toAddrs.length; i++) {
			const stateName1 = getCurrentStateName();
			if (stateName1) checkTaskCancellation(stateName1);
			try {
				await Logger.getInstance().log(`Starting ${i + 1} of ${toAddrs.length} ...`);
				await RelayLink.refuel(
					fromPrivateKey,
					network,
					toChainId,
					Random.float(value[0], value[1]).toFixed(6),
					toAddrs[i],
				);

				const STATE = getStandardState(stateName);
				STATE.successes.push(toAddrs[i]);
				STATE.fails = STATE.fails.filter((f: string) => f !== toAddrs[i]);
				STATE.save();

				if (delayBetweenAccs[1] && i !== toAddrs.length - 1) {
					const waiting = Random.int(delayBetweenAccs[0], delayBetweenAccs[1]);
					await Logger.getInstance().log(`Waiting ${waiting} s. ...`);
					await delay(waiting);
				}
			} catch (e) {
				await Logger.getInstance().log(`Error: ${e}`, MessageType.Error);
				const STATE = getStandardState(stateName);
				if (!STATE.fails.includes(toAddrs[i])) {
					STATE.fails.push(toAddrs[i]);
					STATE.save();
				}
				await delay(5);
			}
		}
	}

	private static async _getRelayChain(chainId: ChainId): Promise<any> {
		const relayChains = (await axios.get('https://api.relay.link/chains')).data.chains;
		const relayTestChains = (await axios.get('https://api.testnets.relay.link/chains')).data.chains;
		const allChains = [...relayChains, ...relayTestChains];

		let chainIdToFind;
		if (chainId === ChainId.Solana) chainIdToFind = 792703809;
		if (chainId === ChainId.Eclipse) chainIdToFind = 9286185;
		chainIdToFind = +chainId;

		if (!chainIdToFind) throw new Error(`Couldnt match string chainId ${chainId} with list in switch!`);
		const relayChain = allChains.find((c) => c.id === chainIdToFind);
		if (!relayChain)
			throw new Error(
				`There is no supported relay chain for ${chainId} in https://docs.relay.link/resources/supported-chains`,
			);

		if (relayChain.disabled || !relayChain.depositEnabled)
			throw new Error(`Refuel for ${relayChain.displayName} is disabled!`);

		return relayChain;
	}
}
