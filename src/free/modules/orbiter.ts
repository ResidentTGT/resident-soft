import { ethers } from 'ethers';
import { Account } from '@utils/account';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';

const CONTRACTS = new Map<ChainId, string>()
	.set(ChainId.Base, '0x80c67432656d59144ceff962e8faf8926599bcf8')
	.set(ChainId.Optimism, '0x80c67432656d59144ceff962e8faf8926599bcf8')
	.set(ChainId.Arbitrum, '0x80c67432656d59144ceff962e8faf8926599bcf8')
	.set(ChainId.Linea, '0x80c67432656d59144ceff962e8faf8926599bcf8');

//https://docs.orbiter.finance/orbiterfinancesbridgeprotocol
const VALUES = new Map<ChainId, number>().set(ChainId.Blast, 9040);
export abstract class Orbiter {
	static async bridge(ACCOUNT: Account, network: Network, toChainId: ChainId, amount: string) {
		if (!ACCOUNT.wallets?.evm?.address) throw new Error('There is no account.wallets.evm.address!');
		if (!ACCOUNT.wallets.evm.private) throw new Error('There is no account.wallets.evm.private in wallet!');

		await Logger.getInstance().log(`Start bridging ${amount} ${network.nativeCoin} to ${toChainId} ...`);

		const amountBn = ethers.parseEther((+amount).toFixed(6));

		const contractAddress = CONTRACTS.get(network.chainId);
		const addValue = VALUES.get(toChainId);
		if (!contractAddress || !addValue) throw new Error(`There is no contract address or addValue for ${network.name}`);
		const value = ethers.formatEther(amountBn + BigInt(addValue));
		await Evm.sendNative(ACCOUNT.wallets.evm.private, network, contractAddress, value);
		await Logger.getInstance().log(`Bridged.`);
	}
}
