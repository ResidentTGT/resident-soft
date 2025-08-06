import { FetchRequest, ethers, FetchGetUrlFunc, FetchCancelSignal, assert, getBytes } from 'ethers';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import http from 'http';
import https from 'https';
import { ChainId } from './chainId';
import { Proxy } from '@utils/account';
import Random from '@utils/random';
import { parse } from 'jsonc-parser';

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

	public static getNetworkByChainId(id: ChainId) {
		const networkConfig = networksConfig.find((n) => n.chainId.toString() === id.toString());
		if (!networkConfig) throw new Error(`There is no network configuration for chainId ${id}`);

		return new Network(id, networkConfig.name, networkConfig.nativeCoin, Random.choose(networkConfig.rpc), getTokens(id));
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

	public setProxyForEthers(proxy: Proxy) {
		const fetchGetUrlFunc: FetchGetUrlFunc = async (req: FetchRequest, signal?: FetchCancelSignal) => {
			const proxyUrl = `http://${proxy.login}:${proxy.password}@${proxy.ip}:${proxy.port}`;
			const proxyAgent = new HttpsProxyAgent(proxyUrl);

			const options = { agent: proxyAgent };
			const protocol = req.url.split(':')[0].toLowerCase();

			assert(protocol === 'http' || protocol === 'https', `unsupported protocol ${protocol}`, 'UNSUPPORTED_OPERATION', {
				info: { protocol },
				operation: 'request',
			});

			assert(
				protocol === 'https' || !req.credentials || req.allowInsecureAuthentication,
				'insecure authorized connections unsupported',
				'UNSUPPORTED_OPERATION',
				{
					operation: 'request',
				},
			);

			const method = req.method;
			const headers = Object.assign({}, req.headers);

			const reqOptions: any = { method, headers };
			if (options) {
				if (options.agent) {
					reqOptions.agent = options.agent;
				}
			}

			const request = (protocol === 'http' ? http : https).request(req.url, reqOptions);

			request.setTimeout(req.timeout);

			const body = req.body;
			if (body) {
				request.write(Buffer.from(body));
			}

			request.end();

			return new Promise((resolve, reject) => {
				// @TODO: Node 15 added AbortSignal; once we drop support for
				// Node14, we can add that in here too

				request.once('response', (resp: http.IncomingMessage) => {
					const statusCode = resp.statusCode || 0;
					const statusMessage = resp.statusMessage || '';
					const headers = Object.keys(resp.headers || {}).reduce(
						(accum, name) => {
							let value = resp.headers[name] || '';
							if (Array.isArray(value)) {
								value = value.join(', ');
							}
							accum[name] = value;
							return accum;
						},
						{} as Record<string, string>,
					);

					let body: null | Uint8Array = null;
					//resp.setEncoding("utf8");

					resp.on('data', (chunk: Uint8Array) => {
						if (signal) {
							try {
								signal.checkSignal();
							} catch (error) {
								return reject(error);
							}
						}

						if (body == null) {
							body = chunk;
						} else {
							const newBody = new Uint8Array(body.length + chunk.length);
							newBody.set(body, 0);
							newBody.set(chunk, body.length);
							body = newBody;
						}
					});

					resp.on('end', () => {
						if (headers['content-encoding'] === 'gzip' && body) {
							body = getBytes(gunzipSync(body));
						}

						resolve({ statusCode, statusMessage, headers, body });
					});

					resp.on('error', (error: any) => {
						//@TODO: Should this just return nornal response with a server error?
						(error as any).response = { statusCode, statusMessage, headers, body };
						reject(error);
					});
				});

				request.on('error', (error: any) => {
					reject(error);
				});
			});
		};
		FetchRequest.registerGetUrl(fetchGetUrlFunc);
	}

	public resetProxyForEthers() {
		const fetchGetUrlFunc: FetchGetUrlFunc = async (req: FetchRequest, signal?: FetchCancelSignal) => {
			const protocol = req.url.split(':')[0].toLowerCase();

			assert(protocol === 'http' || protocol === 'https', `unsupported protocol ${protocol}`, 'UNSUPPORTED_OPERATION', {
				info: { protocol },
				operation: 'request',
			});

			assert(
				protocol === 'https' || !req.credentials || req.allowInsecureAuthentication,
				'insecure authorized connections unsupported',
				'UNSUPPORTED_OPERATION',
				{
					operation: 'request',
				},
			);

			const method = req.method;
			const headers = Object.assign({}, req.headers);

			const reqOptions: any = { method, headers };

			const request = (protocol === 'http' ? http : https).request(req.url, reqOptions);

			request.setTimeout(req.timeout);

			const body = req.body;
			if (body) {
				request.write(Buffer.from(body));
			}

			request.end();

			return new Promise((resolve, reject) => {
				// @TODO: Node 15 added AbortSignal; once we drop support for
				// Node14, we can add that in here too

				request.once('response', (resp: http.IncomingMessage) => {
					const statusCode = resp.statusCode || 0;
					const statusMessage = resp.statusMessage || '';
					const headers = Object.keys(resp.headers || {}).reduce(
						(accum, name) => {
							let value = resp.headers[name] || '';
							if (Array.isArray(value)) {
								value = value.join(', ');
							}
							accum[name] = value;
							return accum;
						},
						{} as Record<string, string>,
					);

					let body: null | Uint8Array = null;
					//resp.setEncoding("utf8");

					resp.on('data', (chunk: Uint8Array) => {
						if (signal) {
							try {
								signal.checkSignal();
							} catch (error) {
								return reject(error);
							}
						}

						if (body == null) {
							body = chunk;
						} else {
							const newBody = new Uint8Array(body.length + chunk.length);
							newBody.set(body, 0);
							newBody.set(chunk, body.length);
							body = newBody;
						}
					});

					resp.on('end', () => {
						if (headers['content-encoding'] === 'gzip' && body) {
							body = getBytes(gunzipSync(body));
						}

						resolve({ statusCode, statusMessage, headers, body });
					});

					resp.on('error', (error: any) => {
						//@TODO: Should this just return nornal response with a server error?
						(error as any).response = { statusCode, statusMessage, headers, body };
						reject(error);
					});
				});

				request.on('error', (error: any) => {
					reject(error);
				});
			});
		};
		FetchRequest.registerGetUrl(fetchGetUrlFunc);
	}
}

export default Network;
