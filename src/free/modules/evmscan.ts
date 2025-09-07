import axios from 'axios';
import { ethers } from 'ethers';
import { Logger, MessageType } from '@utils/logger';
import { ChainId } from '@utils/network';
import { delay } from '@utils/delay';
// Etherscan API Documentation: https://docs.etherscan.io/api-endpoints/contracts
// Polygonscan API Documentation: https://docs.polygonscan.com/

export interface Transaction {
	blockNumber: string;
	timeStamp: string;
	hash: string;
	nonce: string;
	blockHash: string;
	transactionIndex: string;
	from: string;
	to: string;
	value: string;
	gas: string;
	gasPrice: string;
	isError: string;
	txreceipt_status: string;
	input: string;
	contractAddress: string;
	cumulativeGasUsed: string;
	gasUsed: string;
	confirmations: string;
	methodId: string;
	functionName: string;
}

export interface TrFilterParams {
	address: string;
	to?: string;
	from?: string;
	functionName?: string;
	valueMoreOrEqualThan?: number;
	success?: boolean;
	offset?: number;
}

export class Evmscan {
	private readonly _apiKey: string;
	private readonly _chainId: ChainId;
	constructor(apiKey: string, chainId: ChainId) {
		this._apiKey = apiKey;
		this._chainId = chainId;
	}

	async getTransactions(filterParams: TrFilterParams): Promise<Transaction[]> {
		let baseUrl = '';
		if (this._chainId === ChainId.Polygon) {
			baseUrl = 'polygonscan.com';
		} else if (this._chainId === ChainId.Ethereum) {
			baseUrl = 'etherscan.io';
		} else if (this._chainId === ChainId.Linea) {
			baseUrl = 'lineascan.build';
		} else if (this._chainId === ChainId.Arbitrum) {
			baseUrl = 'arbiscan.io';
		} else if (this._chainId === ChainId.Base) {
			baseUrl = 'basescan.org';
		} else if (this._chainId === ChainId.Scroll) {
			baseUrl = 'scrollscan.com';
		} else if (this._chainId === ChainId.Blast) {
			baseUrl = 'blastscan.io';
		} else if (this._chainId === ChainId.Berachain) {
			baseUrl = 'berascan.com';
		} else {
			throw new Error(`There is no scan url for ${this._chainId}`);
		}

		const endblock = 99999999;
		const offset = filterParams.offset ?? 100;

		let txs: Transaction[] = [];
		let attempts = 0;
		while (attempts < 50) {
			attempts++;
			try {
				txs = (
					await axios.get(
						`https://api.${baseUrl}/api?module=account&action=txlist&address=${filterParams.address}&startblock=0&endblock=${endblock}&page=1&offset=${offset}&sort=desc&apikey=${this._apiKey}`,
					)
				).data.result as Transaction[];

				if (filterParams.from) {
					txs = txs.filter((t) => t.from.toUpperCase() === filterParams.from?.toUpperCase());
				}
				if (filterParams.to) {
					txs = txs.filter((t) => t.to.toUpperCase() === filterParams.to?.toUpperCase());
				}
				if (filterParams.success) {
					txs = txs.filter((t) => t.isError === '0' && t.txreceipt_status === '1');
				}
				if (filterParams.functionName) {
					txs = txs.filter((t) => t.functionName.includes(filterParams.functionName ?? ''));
				}
				if (filterParams.valueMoreOrEqualThan) {
					txs = txs.filter((t) => +ethers.formatEther(t.value) >= (filterParams.valueMoreOrEqualThan ?? 0));
				}

				break;
			} catch (e) {
				if (attempts >= 50) {
					throw new Error(`Couldnt get transactions with params ${filterParams}!`);
				} else {
					await Logger.getInstance().log(
						`Something went wrong during getting transactions! ${e} Trying again...`,
						MessageType.Warn,
					);
					await delay(10);
				}
			}
		}

		return txs;
	}
}
