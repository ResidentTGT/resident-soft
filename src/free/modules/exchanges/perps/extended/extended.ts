import axios from 'axios';
import WebSocket from 'ws';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Logger, MessageType } from '@utils/logger';
import { Balance } from './models/balance.interface';
import { ExtendedCredentials } from './models/credentials.interface';
import { MarkPriceMessage } from './models/markPrice.interface';
import { Orderbook } from './models/orderbook.interface';
import { ExtendedPosition } from './models/position.interface';
import {
	ExtendedOrderSide,
	ExtendedOrderRequest,
	ExtendedOrderResponse,
	ExtendedCreateOrderResponse,
	ExtendedOrderDetails,
	ExtendedUpdateWs,
} from './models/order.interface';
import { Market, MarketsApiResponse, StarknetDomain, Fees, FeesApiResponse } from './models/market.interface';
import initWasm, { get_order_msg, sign_message } from '@x10xchange/stark-crypto-wrapper-wasm';
import * as path from 'path';
import { PositionInfo } from '../arbitrage/models';

const STARKNET_DOMAIN: StarknetDomain = {
	name: 'Perpetuals',
	version: 'v0',
	chainId: 'SN_MAIN',
	revision: 1,
};

let wasmInitialized = false;

async function initWasmModule(): Promise<void> {
	if (wasmInitialized) return;

	const wasmDir = path.dirname(require.resolve('@x10xchange/stark-crypto-wrapper-wasm'));
	const wasmBuffer = fs.readFileSync(`${wasmDir}/stark_crypto_wrapper_wasm_bg.wasm`);
	await initWasm({ module_or_path: wasmBuffer });
	wasmInitialized = true;
}

//https://api.docs.extended.exchange/#extended-api-documentation

export class Extended {
	private _restApiPrefix = 'https://api.starknet.extended.exchange/api/v1/';
	private _wsPrefix = 'wss://api.starknet.extended.exchange/stream.extended.exchange/v1/';
	private _credentials: ExtendedCredentials;
	private _logger = Logger.getInstance();
	private _marketCache = new Map<string, Market>();
	private _feesCache = new Map<string, Fees>();
	private _warmupPromise: Promise<void> | null = null;

	constructor(credentials: ExtendedCredentials) {
		this._credentials = credentials;
	}

	/**
	 * Ensures WASM and market cache are initialized.
	 * Called automatically on first order, but can be called manually for earlier warmup.
	 */
	private async _ensureWarmedUp(): Promise<void> {
		if (this._warmupPromise) {
			return this._warmupPromise;
		}

		this._warmupPromise = this._doWarmup();
		return this._warmupPromise;
	}

	private async _doWarmup(): Promise<void> {
		const startTime = Date.now();
		this._logger.log(`[Extended] Initializing WASM and caches...`);

		// Initialize WASM
		await initWasmModule();

		// Pre-fetch and cache all markets and fees in parallel
		const [marketsResp, feesResp] = await Promise.all([
			axios.get<MarketsApiResponse>(`${this._restApiPrefix}info/markets`),
			axios.get<FeesApiResponse>(`${this._restApiPrefix}user/fees`, { headers: this._getHeaders() }),
		]);

		for (const market of marketsResp.data.data) {
			this._marketCache.set(market.name, market);
		}

		for (const fee of feesResp.data.data) {
			this._feesCache.set(fee.market, fee);
		}

		this._logger.log(
			`[Extended] Ready in ${Date.now() - startTime}ms (cached ${this._marketCache.size} markets, ${this._feesCache.size} fees)`,
		);
	}

	async getAccountDetails(): Promise<unknown> {
		const resp = await axios.get(`${this._restApiPrefix}user/account/info`, { headers: this._getHeaders() });

		return resp.data;
	}

	async getBalance(): Promise<Balance> {
		const resp = await axios.get(`${this._restApiPrefix}user/balance`, { headers: this._getHeaders() });

		return resp.data;
	}

	private _getHeaders() {
		return {
			'X-Api-Key': this._credentials.apiKey,
		};
	}

	// Market Data Methods

	async getMarket(market: string, forceRefresh = false): Promise<Market> {
		// Use cache if available and not forcing refresh
		if (!forceRefresh) {
			const cached = this._marketCache.get(market);
			if (cached) return cached;
		}

		const resp = await axios.get<MarketsApiResponse>(`${this._restApiPrefix}info/markets`);

		// Update cache with all markets
		for (const m of resp.data.data) {
			this._marketCache.set(m.name, m);
		}

		const found = this._marketCache.get(market);
		if (!found) throw new Error(`Market not found: ${market}`);
		return found;
	}

	async getFees(market: string, forceRefresh = false): Promise<Fees> {
		if (!forceRefresh) {
			const cached = this._feesCache.get(market);
			if (cached) return cached;
		}

		const resp = await axios.get<FeesApiResponse>(`${this._restApiPrefix}user/fees`, {
			headers: this._getHeaders(),
		});

		// Update cache with all fees
		for (const f of resp.data.data) {
			this._feesCache.set(f.market, f);
		}

		const found = this._feesCache.get(market);
		if (!found) throw new Error(`Fees not found: ${market}`);
		return found;
	}

	getStarknetDomain(): StarknetDomain {
		return STARKNET_DOMAIN;
	}

	async getPositions(market?: string): Promise<ExtendedPosition[]> {
		const url = market ? `${this._restApiPrefix}user/positions?market=${market}` : `${this._restApiPrefix}user/positions`;

		const resp = await axios.get<{ status: string; data: ExtendedPosition[] }>(url, { headers: this._getHeaders() });
		return resp.data.data;
	}

	async getOrderByExternalId(externalId: string): Promise<ExtendedOrderDetails> {
		const resp = await axios.get<{ status: string; data: ExtendedOrderDetails[] }>(
			`${this._restApiPrefix}user/orders/external/${externalId}`,
			{ headers: this._getHeaders() },
		);
		if (!resp.data.data?.length) {
			throw new Error(`Order not found: ${externalId}`);
		}
		return resp.data.data[0];
	}

	// StarkNet Signing Methods

	private _computeOrderHash(params: {
		positionId: string;
		baseAssetId: string;
		baseAmount: string;
		quoteAssetId: string;
		quoteAmount: string;
		feeAssetId: string;
		feeAmount: string;
		expiration: string;
		salt: string;
		userPublicKey: string;
		domain: StarknetDomain;
	}): string {
		// Normalize hex string: parse as BigInt and convert back to hex with 0x prefix
		// This matches official SDK behavior: Decimal(hexStr, 16).toString(16) -> toHexString()
		const normalizeHex = (s: string): string => {
			const cleaned = s.startsWith('0x') ? s.slice(2) : s;
			const bigInt = BigInt('0x' + cleaned);
			return '0x' + bigInt.toString(16);
		};

		return get_order_msg(
			params.positionId,
			normalizeHex(params.baseAssetId),
			params.baseAmount,
			normalizeHex(params.quoteAssetId),
			params.quoteAmount,
			normalizeHex(params.feeAssetId),
			params.feeAmount,
			params.expiration,
			params.salt,
			normalizeHex(params.userPublicKey),
			params.domain.name,
			params.domain.version,
			params.domain.chainId,
			params.domain.revision.toString(),
		);
	}

	private _signMessage(messageHash: string): { r: string; s: string } {
		const sig = sign_message(this._credentials.starkPrivateKey, messageHash);
		return { r: sig.r, s: sig.s };
	}

	// Trading Methods

	async placeMarketOrder(
		symbol: string,
		side: ExtendedOrderSide,
		quantity: string,
		price: string,
	): Promise<ExtendedOrderResponse> {
		const t0 = Date.now();

		// Ensure WASM and market cache are ready (fast if already initialized)
		await this._ensureWarmedUp();

		// Use cached market and fees data
		const market = this._marketCache.get(symbol) || (await this.getMarket(symbol));

		const fees = this._feesCache.get(symbol) || (await this.getFees(symbol));

		const feeRate = parseFloat(fees.takerFeeRate);

		const qty = parseFloat(quantity);
		const prc = parseFloat(price);

		// Worst price with 5% slippage to guarantee execution, rounded to tick size
		// BUY: price higher (willing to pay more), SELL: price lower (willing to receive less)
		const tickSize = parseFloat(market.tradingConfig.minPriceChange);
		const slippageMultiplier = side === 'buy' ? 1.05 : 0.95;
		const worstPriceRaw = prc * slippageMultiplier;
		const roundFn = side === 'buy' ? Math.ceil : Math.floor;
		const worstPriceNum = roundFn(worstPriceRaw / tickSize) * tickSize;
		const worstPrice = worstPriceNum.toFixed(this._getPriceDecimals(tickSize));

		const collateralResolution = market.l2Config.collateralResolution;
		const syntheticResolution = market.l2Config.syntheticResolution;

		// Rounding functions based on order side (official SDK behavior):
		// BUY: ROUND_UP, SELL: ROUND_DOWN, Fees: always ROUND_UP
		const roundForSide = side === 'buy' ? Math.ceil : Math.floor;

		// Base amount (synthetic) - apply directional rounding, negative if selling
		const baseAmountRaw = roundForSide(qty * syntheticResolution);
		const baseAmount = side === 'sell' ? -baseAmountRaw : baseAmountRaw;

		// Quote amount (collateral) - apply directional rounding, negative if buying
		// Use worstPriceNum to match the price in the order request (signature must match)
		const quoteAmountRaw = roundForSide(qty * worstPriceNum * collateralResolution);
		const quoteAmount = side === 'buy' ? -quoteAmountRaw : quoteAmountRaw;

		// Fee amount in collateral - always round UP (worst case for user)
		const feeAmount = Math.ceil(qty * worstPriceNum * feeRate * collateralResolution);

		// Generate nonce (must be in valid range: 1 to 2^31)
		const nonce = Math.floor(Math.random() * 2147483647) + 1;

		// Expiry: 7 days from now (in seconds) for the API request
		const expiryEpochSeconds = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
		const expiryEpochMillis = expiryEpochSeconds * 1000;

		// L2 expiration: add 14-day settlement buffer for StarkNet hash computation
		const STARKNET_SETTLEMENT_BUFFER_SECONDS = 14 * 24 * 60 * 60;
		const l2ExpirationSeconds = expiryEpochSeconds + STARKNET_SETTLEMENT_BUFFER_SECONDS;

		// Compute order hash
		const orderHash = this._computeOrderHash({
			positionId: this._credentials.vaultId,
			baseAssetId: market.l2Config.syntheticId,
			baseAmount: baseAmount.toString(),
			quoteAssetId: market.l2Config.collateralId,
			quoteAmount: quoteAmount.toString(),
			feeAssetId: market.l2Config.collateralId,
			feeAmount: feeAmount.toString(),
			expiration: l2ExpirationSeconds.toString(),
			salt: nonce.toString(),
			userPublicKey: this._credentials.starkPublicKey,
			domain: STARKNET_DOMAIN,
		});

		// Sign the order hash
		const signature = this._signMessage(orderHash);

		// Build order request
		const orderRequest: ExtendedOrderRequest = {
			id: uuidv4(),
			market: symbol,
			type: 'MARKET',
			side: side === 'buy' ? 'BUY' : 'SELL',
			qty: quantity,
			price: worstPrice,
			fee: feeRate.toString(),
			expiryEpochMillis,
			timeInForce: 'IOC',
			nonce: nonce.toString(),
			settlement: {
				signature,
				starkKey: this._credentials.starkPublicKey,
				collateralPosition: this._credentials.vaultId,
			},
			reduceOnly: false,
			postOnly: false,
		};
		const t3 = Date.now();
		let resp;
		try {
			resp = await axios.post<ExtendedCreateOrderResponse>(`${this._restApiPrefix}user/order`, orderRequest, {
				headers: {
					...this._getHeaders(),
					'Content-Type': 'application/json',
				},
			});
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				await this._logger.log(`[Extended] API error: ${JSON.stringify(error.response.data)}`, MessageType.Error);
			}
			throw error;
		}
		const t4 = Date.now();

		await this._logger.log(`[Extended] placeMarketOrder timings: createOrder=${t4 - t3}ms, total=${t4 - t0}ms`);

		return {
			id: resp.data.data.id,
			externalId: resp.data.data.externalId,
		};
	}

	async closePosition(positionInfo: PositionInfo): Promise<ExtendedOrderResponse> {
		const closeSide = positionInfo.side === 'long' ? 'sell' : 'buy';
		const closeQuantity = positionInfo.quantity;

		// Get market to determine price precision
		const market = this._marketCache.get(positionInfo.symbol) || (await this.getMarket(positionInfo.symbol));
		const tickSize = parseFloat(market.tradingConfig.minPriceChange);

		// Get price - use provided price or fall back to market price from stats
		const rawPrice = positionInfo.price ? parseFloat(positionInfo.price) : parseFloat(market.marketStats.markPrice);

		// Round to tick size with slippage direction for market orders:
		// - Closing LONG (sell): round DOWN (worse price for seller)
		// - Closing SHORT (buy): round UP (worse price for buyer)
		let closePrice: string;
		if (closeSide === 'sell') {
			// Round down to tick size
			closePrice = (Math.floor(rawPrice / tickSize) * tickSize).toFixed(this._getPriceDecimals(tickSize));
		} else {
			// Round up to tick size
			closePrice = (Math.ceil(rawPrice / tickSize) * tickSize).toFixed(this._getPriceDecimals(tickSize));
		}

		await this._logger.log(
			`[Extended] closePosition: rawPrice=${rawPrice}, tickSize=${tickSize}, roundedPrice=${closePrice}, side=${closeSide}`,
			MessageType.Debug,
		);

		return this.placeMarketOrder(positionInfo.symbol, closeSide, closeQuantity, closePrice);
	}

	// Helper to get decimal places from tick size
	private _getPriceDecimals(tickSize: number): number {
		const str = tickSize.toString();
		const decimalIndex = str.indexOf('.');
		if (decimalIndex === -1) return 0;
		return str.length - decimalIndex - 1;
	}

	// WebSocket Methods

	subscribeMarkPrice(market: string, onMessage: (data: MarkPriceMessage) => void, onError?: (error: Error) => void): WebSocket {
		const url = `${this._wsPrefix}prices/mark/${market}`;
		const ws = new WebSocket(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0',
			},
		});

		ws.on('message', (raw: Buffer) => {
			const message = JSON.parse(raw.toString()) as MarkPriceMessage;
			onMessage(message);
		});

		ws.on('error', (err) => {
			if (onError) onError(err);
		});

		ws.on('ping', () => {
			ws.pong();
		});

		return ws;
	}

	async recordMarkPrices(market: string, durationMs: number, filePath: string): Promise<number> {
		return new Promise((resolve, reject) => {
			const records: MarkPriceMessage[] = [];

			const ws = this.subscribeMarkPrice(
				market,
				(data) => {
					records.push(data);
				},
				(err) => {
					ws.close();
					reject(err);
				},
			);

			ws.on('open', () => {
				this._logger.log(`Recording mark prices for ${market} for ${durationMs}ms...`);
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

	/**
	 * Pre-initialize WASM and market cache for faster order execution.
	 * Call before trading starts. Safe to call multiple times.
	 */
	async warmup(): Promise<void> {
		return this._ensureWarmedUp();
	}

	// https://api.docs.extended.exchange/#order-book-stream
	subscribeOrderbook(
		market: string,
		fullOrderbook: boolean,
		onMessage: (data: Orderbook) => void,
		onError?: (error: Error) => void,
	): WebSocket {
		let url = `${this._wsPrefix}orderbooks/${market}`;
		if (!fullOrderbook) url += '?depth=1';
		const ws = new WebSocket(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0',
			},
		});

		ws.on('message', (raw: Buffer) => {
			const message = JSON.parse(raw.toString()) as Orderbook;
			onMessage(message);
		});

		ws.on('error', (err) => {
			if (onError) onError(err);
		});

		ws.on('ping', () => {
			ws.pong();
		});

		return ws;
	}

	// Private stream for account updates
	subscribeAccount(onMessage: (data: ExtendedUpdateWs) => void, onError?: (error: Error) => void): WebSocket {
		// Private stream URL (requires API key in headers)
		const url = `${this._wsPrefix}account`;
		const ws = new WebSocket(url, {
			headers: {
				'X-Api-Key': this._credentials.apiKey,
				'User-Agent': 'Mozilla/5.0',
			},
		});

		ws.on('message', (raw: Buffer) => {
			const message = JSON.parse(raw.toString());

			onMessage(message as ExtendedUpdateWs);
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
