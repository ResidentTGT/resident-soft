import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { ChainId } from './chainId';
import { parse } from 'jsonc-parser';
import { Logger, MessageType } from '../logger';

export interface Token {
	symbol: string;
	address: string;
}

interface NetworkConfig {
	chainId: number | string;
	name: string;
	nativeCoin: string;
	rpc: string[];
}

const networksConfig = parse(readFileSync('./networks.jsonc', 'utf-8')) as NetworkConfig[];
const tokensConfig = parse(readFileSync('./tokens.jsonc', 'utf-8')) as { chainId: number | string; tokens: Token[] }[];

function getTokens(chainId: ChainId): Token[] {
	const entry = tokensConfig.find((item) => item.chainId.toString() === chainId.toString());
	return entry ? entry.tokens : [];
}

export class Network {
	readonly chainId: ChainId;
	readonly name: string;
	readonly nativeCoin: string;
	rpc?: string;
	readonly tokens: Token[] = [];
	provider?: ethers.JsonRpcProvider;

	constructor(chainId: ChainId, name: string, nativeCoin: string, rpc: string, tokens: Token[] = []) {
		this.chainId = chainId;
		this.name = name;
		this.nativeCoin = nativeCoin;
		this.tokens = tokens;
		this.rpc = rpc;
		if (rpc && Network.isEvm(chainId)) {
			this.provider = new ethers.JsonRpcProvider(rpc);
		}
	}

	public static checkChainId(id: any) {
		if (id === null || id === undefined || !ChainId[id])
			throw new Error(`Invalid chainId: ${id}. Check allowed here: https://resident.gitbook.io/resident-soft/chain-ids`);
	}

	public static async getNetworkByChainId(id: ChainId) {
		const networkConfig = networksConfig.find((n) => n.chainId.toString() === id.toString());
		if (!networkConfig) throw new Error(`There is no network configuration for chainId ${id}`);
		const rpcs = networkConfig.rpc.shuffle();
		const logger = await Logger.getInstance();

		let selectedRpc = '';
		if (Network.isEvm(id)) {
			for (const rpc of rpcs) {
				let provider;
				try {
					provider = new ethers.JsonRpcProvider(rpc, Number(id));
					await provider.getBlockNumber();
					selectedRpc = rpc;
					await provider.destroy();
					break;
				} catch (err) {
					await provider?.destroy();
					await logger.log(`RPC ${rpc} connection failed (${networkConfig.name}):\n${String(err)}`, MessageType.Warn);
				}
			}
			if (!selectedRpc) throw new Error(`There is no working rpc for ${networkConfig.name}!`);
		} else {
			selectedRpc = rpcs[0];
		}

		return new Network(id, networkConfig.name, networkConfig.nativeCoin, selectedRpc, getTokens(id));
	}

	public static isEvm(id: ChainId): boolean {
		const notEvm = [ChainId.Aptos, ChainId.Starknet, ChainId.Sui, ChainId.Solana, ChainId.Eclipse];
		return !notEvm.includes(id);
	}

	public static isSvm(id: ChainId): boolean {
		const svm = [ChainId.Solana, ChainId.Eclipse];
		return svm.includes(id);
	}

	public getProvider(): ethers.JsonRpcProvider {
		if (!this.provider) throw new Error(`There is no provider for ${this.name}`);

		return this.provider;
	}

	public getRpc(): string {
		if (!this.rpc) throw new Error(`There is no rpc for ${this.name}`);

		return this.rpc;
	}

	public setRpc(rpc: string) {
		this.rpc = rpc;
		if (Network.isEvm(this.chainId)) {
			this.provider = new ethers.JsonRpcProvider(rpc);
		}
	}
}

export default Network;
