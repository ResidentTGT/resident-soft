import { ethers } from 'ethers';
import { ChainId } from './chainId';
import { Logger, MessageType } from '../logger';
import { parse } from 'jsonc-parser';
import fs from 'fs';
import { shuffleArray } from '../shuffleArray';

export interface Token {
	symbol: string;
	address: string;
}

export interface NetworkConfig {
	chainId: ChainId;
	name: string;
	nativeCoin: string;
	rpc: string[];
}

export interface TokenConfig {
	chainId: ChainId;
	tokens: Token[];
}

export class Network {
	readonly chainId: ChainId;
	readonly name: string;
	readonly nativeCoin: string;

	static networksConfig: NetworkConfig[] = [];
	static tokensConfig: TokenConfig[] = [];

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
		if (id === null || id === undefined || (!Object.values(ChainId).includes(id) && !Object.values(ChainId).includes(id[0])))
			throw new Error(`Invalid chainId: ${id}. Check allowed here: https://resident.gitbook.io/resident-soft/chain-ids`);
	}

	public static loadNetworksAndTokensConfigs() {
		this.networksConfig = parse(fs.readFileSync('./networks.jsonc', 'utf-8')) as NetworkConfig[];
		this.tokensConfig = parse(fs.readFileSync('./tokens.jsonc', 'utf-8')) as TokenConfig[];
	}

	public static getAllNetworksConfigs() {
		return this.networksConfig;
	}

	public static getAllTokensConfigs() {
		return this.tokensConfig;
	}

	public static async getNetworkByChainId(id: ChainId) {
		const networkConfig = this.networksConfig.find((n) => n.chainId === id);
		if (!networkConfig) throw new Error(`There is no network configuration for chainId ${id}`);
		const rpcs = shuffleArray(networkConfig.rpc);
		const logger = await Logger.getInstance();

		let selectedRpc = '';
		if (Network.isEvm(id)) {
			for (const rpc of rpcs) {
				let provider;
				try {
					provider = new ethers.JsonRpcProvider(rpc, +id);
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

		return new Network(id, networkConfig.name, networkConfig.nativeCoin, selectedRpc, this.getTokens(id));
	}

	public static isEvm(id: ChainId): boolean {
		const notEvm = [ChainId.Aptos, ChainId.Starknet, ChainId.Sui, ChainId.Solana, ChainId.Eclipse];
		return !notEvm.includes(id);
	}

	public static isSvm(id: ChainId): boolean {
		const svm = [ChainId.Solana, ChainId.Eclipse];
		return svm.includes(id);
	}

	public static getTokens(chainId: ChainId): Token[] {
		const entry = this.tokensConfig.find((item) => item.chainId === chainId);
		return entry ? entry.tokens : [];
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
