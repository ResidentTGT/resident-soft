import { ethers } from 'ethers';
import { ChainId, Network } from '@utils/network';
import { delay } from '@utils/delay';
import { Logger } from '@utils/logger';
import { ERC721_ABI } from '@utils/abi';

export async function waitNftBalance(
	address: string,
	chainId: ChainId,
	contractAddress: string,
	waitingBalance: number,
	delayInS = 10,
	attemptsBeforeError = Number.MAX_SAFE_INTEGER,
) {
	const network = Network.getNetworkByChainId(chainId);

	let normBalance;
	let attempts = 0;
	while (!normBalance && attempts < attemptsBeforeError) {
		attempts++;
		try {
			const contract = new ethers.Contract(contractAddress, ERC721_ABI, network.getProvider());
			const balance = await contract.balanceOf(address);

			if (balance >= waitingBalance) {
				normBalance = true;
			} else {
				if (attempts >= attemptsBeforeError) {
					throw new Error(`Couldnt wait ${waitingBalance} NFT on ${ChainId[+chainId]} with ${attempts} attempts!`);
				} else {
					await Logger.getInstance().log(
						`Balance: ${balance} NFT. Waiting for ${waitingBalance} NFT on ${ChainId[+chainId]} ...`,
					);
					await delay(delayInS);
				}
			}
		} catch {
			if (attempts >= attemptsBeforeError) {
				throw new Error(`Couldnt wait ${waitingBalance} NFT on ${ChainId[+chainId]} with ${attempts} attempts!`);
			} else {
				await Logger.getInstance().log('Couldnt get NFT balance! Trying again...');
				await delay(delayInS);
			}
		}
	}
}
