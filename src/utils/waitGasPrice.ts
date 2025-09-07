import { ethers } from 'ethers';
import { ChainId, Network } from '@utils/network';
import { delay } from '@utils/delay';
import { Logger } from '@utils/logger';

export async function waitGasPrice(chainId: ChainId, gasPriceInGwei: number, delayInS = 30) {
	const network = await Network.getNetworkByChainId(chainId);
	const provider = network.getProvider();

	let normGas;
	while (!normGas) {
		try {
			const feeData = await provider.getFeeData();
			const gasPriceBn = feeData.gasPrice ?? feeData.maxFeePerGas;
			if (!gasPriceBn) throw new Error();
			const gasPrice = +(+ethers.formatUnits(gasPriceBn, 'gwei')).toFixed(6);
			if (gasPrice > gasPriceInGwei) {
				await Logger.getInstance().log(
					gasPrice
						? `Gas price: ${gasPrice} gwei on ${network.name}. Waiting for ${gasPriceInGwei} gwei...`
						: 'Couldnt get gas price! Trying again...',
				);
				await delay(delayInS);
			} else {
				normGas = true;
			}
		} catch {
			await Logger.getInstance().log('Couldnt get gas price! Trying again...');
			await delay(delayInS);
		}
	}
}
