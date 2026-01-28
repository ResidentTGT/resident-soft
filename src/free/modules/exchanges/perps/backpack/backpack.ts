import axios from 'axios';
import WebSocket from 'ws';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Logger } from '@utils/logger';
import { BackpackCredentials } from './models/credentials.interface';
import { Balances } from './models/balance.interface';
import { TickerMessage } from './models/ticker.interface';
import { BookTickerMessage } from './models/orderbook.interface';
import { OrderRequest, OrderResponse, OrderSide, BackpackOrderUpdateWs } from './models/order.interface';
import { Position } from './models/position.interface';
import { PositionInfo } from '../arbitrage/models';

//https://docs.backpack.exchange/

export class Backpack {
	private _restApiPrefix = 'https://api.backpack.exchange/';
	private _wsPrefix = 'wss://ws.backpack.exchange/';
	private _credentials: BackpackCredentials;
	private _defaultWindow = 5000;
	private _logger = Logger.getInstance();

	constructor(credentials: BackpackCredentials) {
		this._credentials = credentials;
	}

	async getAccountDetails() {
		const headers = this._getSignedHeaders('accountQuery');
		const resp = await axios.get(`${this._restApiPrefix}api/v1/account`, { headers });
		return resp.data;
	}

	async getBalances(): Promise<Balances> {
		const headers = this._getSignedHeaders('balanceQuery');
		const resp = await axios.get<Balances>(`${this._restApiPrefix}api/v1/capital`, { headers });
		return resp.data;
	}

	private _buildSigningString(
		instruction: string,
		params?: Record<string, unknown>,
		timestamp?: number,
		window?: number,
	): string {
		const ts = timestamp ?? Date.now();
		const win = window ?? this._defaultWindow;

		let signStr = `instruction=${instruction}`;

		if (params && Object.keys(params).length > 0) {
			const sortedParams = Object.keys(params)
				.sort()
				.map((key) => {
					let value = params[key];
					if (typeof value === 'boolean') {
						value = value.toString().toLowerCase();
					}
					return `${key}=${value}`;
				})
				.join('&');

			signStr += `&${sortedParams}`;
		}

		signStr += `&timestamp=${ts}&window=${win}`;
		return signStr;
	}

	private _sign(message: string): string {
		const privateKeyBytes = Buffer.from(this._credentials.apiSecret, 'base64');

		// ED25519 PKCS8 header for raw 32-byte seed
		const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
		const pkcs8Key = Buffer.concat([pkcs8Header, privateKeyBytes]);

		const privateKey = crypto.createPrivateKey({
			key: pkcs8Key,
			format: 'der',
			type: 'pkcs8',
		});

		const signature = crypto.sign(null, Buffer.from(message), privateKey);
		return signature.toString('base64');
	}

	private _getSignedHeaders(instruction: string, params?: Record<string, unknown>): Record<string, string> {
		const timestamp = Date.now();
		const window = this._defaultWindow;

		const signStr = this._buildSigningString(instruction, params, timestamp, window);
		const signature = this._sign(signStr);

		return {
			'X-API-Key': this._credentials.apiKey,
			'X-Signature': signature,
			'X-Timestamp': timestamp.toString(),
			'X-Window': window.toString(),
			'Content-Type': 'application/json',
		};
	}

	subscribeTicker(symbol: string, onMessage: (data: TickerMessage) => void, onError?: (error: Error) => void): WebSocket {
		const ws = new WebSocket(this._wsPrefix);

		ws.on('open', () => {
			const subscribeMsg = {
				method: 'SUBSCRIBE',
				params: [`ticker.${symbol}`],
			};

			ws.send(JSON.stringify(subscribeMsg));
		});

		ws.on('message', (raw: Buffer) => {
			const rawStr = raw.toString();

			const message = JSON.parse(rawStr) as TickerMessage;
			if (message.stream?.startsWith('ticker.')) {
				onMessage(message);
			}
		});

		ws.on('error', (err) => {
			if (onError) onError(err);
		});

		ws.on('ping', () => {
			ws.pong();
		});

		return ws;
	}

	async getTickerPrice(symbol: string): Promise<TickerMessage> {
		return new Promise((resolve, reject) => {
			const ws = this.subscribeTicker(
				symbol,
				(data) => {
					ws.close();
					resolve(data);
				},
				(err) => {
					ws.close();
					reject(err);
				},
			);

			setTimeout(() => {
				ws.close();
				reject(new Error('Ticker request timed out'));
			}, 10000);
		});
	}

	async recordTickers(symbol: string, durationMs: number, filePath: string): Promise<number> {
		return new Promise((resolve, reject) => {
			const records: TickerMessage[] = [];

			const ws = this.subscribeTicker(
				symbol,
				(data) => {
					records.push(data);
				},
				(err) => {
					ws.close();
					reject(err);
				},
			);

			ws.on('open', () => {
				this._logger.log(`Recording tickers for ${symbol} for ${durationMs}ms...`);
			});

			ws.on('close', () => {
				fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
				this._logger.log(`Saved ${records.length} records to ${filePath}`);
				resolve(records.length);
			});

			setTimeout(() => {
				ws.close();
			}, durationMs);
		});
	}

	subscribeOrderbook(
		symbol: string,
		onMessage: (data: BookTickerMessage) => void,
		onError?: (error: Error) => void,
	): WebSocket {
		const ws = new WebSocket(this._wsPrefix);

		ws.on('open', () => {
			const subscribeMsg = {
				method: 'SUBSCRIBE',
				params: [`bookTicker.${symbol}`],
			};

			ws.send(JSON.stringify(subscribeMsg));
		});

		ws.on('message', (raw: Buffer) => {
			const rawStr = raw.toString();

			const message = JSON.parse(rawStr) as BookTickerMessage;
			if (message.stream?.startsWith('bookTicker.')) {
				onMessage(message);
			}
		});

		ws.on('error', (err) => {
			if (onError) onError(err);
		});

		ws.on('ping', () => {
			ws.pong();
		});

		return ws;
	}

	// Trading Methods

	async placeMarketOrder(symbol: string, side: OrderSide, quantity: string): Promise<OrderResponse> {
		const params: OrderRequest = {
			symbol,
			side,
			orderType: 'Market',
			quantity,
		};

		const headers = this._getSignedHeaders('orderExecute', params as unknown as Record<string, unknown>);
		const resp = await axios.post<OrderResponse>(`${this._restApiPrefix}api/v1/order`, params, { headers });

		return resp.data;
	}

	async getPosition(symbol?: string): Promise<Position[]> {
		const params = symbol ? { symbol } : undefined;
		const headers = this._getSignedHeaders('positionQuery', params);
		const url = symbol ? `${this._restApiPrefix}api/v1/position?symbol=${symbol}` : `${this._restApiPrefix}api/v1/position`;

		try {
			const resp = await axios.get<Position[]>(url, { headers });
			return resp.data;
		} catch (error) {
			// Backpack returns 404 when no position exists
			if (axios.isAxiosError(error) && error.response?.status === 404) {
				return [];
			}
			throw error;
		}
	}

	async closePosition(positionInfo: PositionInfo): Promise<OrderResponse> {
		const closeSide = positionInfo.side === 'long' ? 'Ask' : 'Bid';
		const closeQuantity = positionInfo.quantity;

		const params: OrderRequest = {
			symbol: positionInfo.symbol,
			side: closeSide,
			orderType: 'Market',
			quantity: closeQuantity,
			reduceOnly: true,
		};

		const headers = this._getSignedHeaders('orderExecute', params as unknown as Record<string, unknown>);
		const resp = await axios.post<OrderResponse>(`${this._restApiPrefix}api/v1/order`, params, { headers });

		return resp.data;
	}

	// Private stream for order updates
	subscribeOrderUpdates(
		symbol: string,
		onMessage: (data: BackpackOrderUpdateWs) => void,
		onError?: (error: Error) => void,
	): WebSocket {
		const ws = new WebSocket(this._wsPrefix);

		ws.on('open', () => {
			// Private streams require signed subscription
			const timestamp = Date.now();
			const window = this._defaultWindow;
			const signStr = this._buildSigningString('subscribe', undefined, timestamp, window);
			const signature = this._sign(signStr);

			const subscribeMsg = {
				method: 'SUBSCRIBE',
				params: [`account.orderUpdate.${symbol}`],
				signature: [this._credentials.apiKey, signature, timestamp.toString(), window.toString()],
			};

			ws.send(JSON.stringify(subscribeMsg));
		});

		ws.on('message', (raw: Buffer) => {
			const message = JSON.parse(raw.toString());

			onMessage(message as BackpackOrderUpdateWs);
		});

		ws.on('error', (err) => {
			if (onError) onError(err);
		});

		ws.on('ping', () => {
			ws.pong();
		});

		return ws;
	}
}
