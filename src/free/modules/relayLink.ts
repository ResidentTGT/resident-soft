import { ethers } from 'ethers';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';
import axios from 'axios';

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
