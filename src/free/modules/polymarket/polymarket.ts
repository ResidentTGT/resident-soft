import { Account } from '@utils/account';
import { Logger, MessageType } from '@utils/logger';
import { MissingFieldError } from '@src/utils/errors';

import {
	ClobClient,
	OrderType,
	ApiKeyCreds,
	TradeParams,
	Trade,
	OpenOrderParams,
	OpenOrder,
	UserOrder,
	CreateOrderOptions,
	UserMarketOrder,
} from '@polymarket/clob-client';
import { Wallet } from '@ethersproject/wallet';
import { MarketInfo, Market, MarketOrderResponse, Position } from './polymarket.types';
import { ChainId, Network } from '@src/utils/network';
import { ethers } from 'ethers';
import axios from 'axios';

const categories: string[] = [
	'Politics',
	'Sports',
	'Finance',
	'Crypto',
	'Earnings',
	'Tech',
	'Culture',
	'World',
	'Economy',
	'Elections',
];

const POLYMARKET_CLOB_HOST = 'https://clob.polymarket.com';

const FUNDER_ADDR = '';

const TOKENS_CONTRACT_ADDR = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';

export class Polymarket {
	private _client: ClobClient = new ClobClient(POLYMARKET_CLOB_HOST, +ChainId.Polygon);
	private _network: Network | null = null;

	async initializeClientAndNetwork(account: Account): Promise<ClobClient> {
		if (!account.wallets?.evm?.private) {
			throw new MissingFieldError('wallets.evm.private');
		}

		const logger = Logger.getInstance();

		try {
			const signer = new Wallet(account.wallets.evm.private);

			const tempClient = new ClobClient(POLYMARKET_CLOB_HOST, +ChainId.Polygon, signer);

			await logger.log(`Deriving API credentials for ${account.name}...`);

			const creds: ApiKeyCreds = await tempClient.createOrDeriveApiKey();

			const signatureType = 2;

			const client = new ClobClient(POLYMARKET_CLOB_HOST, +ChainId.Polygon, signer, creds, signatureType, FUNDER_ADDR);

			this._client = client;

			await logger.log(`CLOB client initialized for ${account.name}`);

			this._network = await Network.getNetworkByChainId(ChainId.Polygon);

			return client;
		} catch (error: any) {
			if (error.toString().includes('403') || error.toString().includes('Forbidden')) {
				throw new Error(
					`Polymarket API access forbidden. This may be due to geographic restrictions. Use a proxy or VPN.\n${error}`,
				);
			}
			if (error.toString().includes('ECONNREFUSED') || error.toString().includes('ETIMEDOUT')) {
				throw new Error(`Cannot connect to Polymarket CLOB API. Check network connection.\n${error}`);
			}
			throw new Error(`Failed to initialize Polymarket client: ${error}`);
		}
	}

	async getMarkets(conditionIds: string[] = [], includeOrderBook = false): Promise<MarketInfo[]> {
		const logger = Logger.getInstance();

		try {
			const markets: MarketInfo[] = [];

			if (conditionIds && conditionIds.length > 0) {
				await logger.log(`Fetching ${conditionIds.length} specific markets...`);

				for (const conditionID of conditionIds) {
					const market = (await this._client.getMarket(conditionID)) as Market;

					const marketInfo: MarketInfo = {
						market,
					};

					// Get order book if requested
					if (includeOrderBook && market.tokens && market.tokens.length > 0) {
						const tokenID = market.tokens[0].token_id;
						const orderBook = await this._client.getOrderBook(tokenID);

						marketInfo.orderBook = {
							bids: orderBook.bids.map((b) => ({ price: b.price, size: b.size })),
							asks: orderBook.asks.map((a) => ({ price: a.price, size: a.size })),
						};

						// Get last trade price
						const lastPrice = await this._client.getLastTradePrice(tokenID);
						marketInfo.lastPrice = lastPrice;
					}

					markets.push(marketInfo);
				}
			} else {
				await logger.log('Fetching all markets...');

				let cursor: string | undefined;
				let page = 1;

				do {
					const response = await this._client.getMarkets(cursor);

					await logger.log(`Fetched page ${page}, ${response.data?.length || 0} markets`);

					if (response.data) {
						for (const market of response.data) {
							markets.push({
								market,
							});
						}
					}

					cursor = response.next_cursor;
					page++;

					// Limit to prevent excessive API calls
					if (page > 10) {
						await logger.log('Reached pagination limit (10 pages)', MessageType.Warn);
						break;
					}
				} while (cursor);
			}

			await logger.log(`Total markets fetched: ${markets.length}`);

			return markets;
		} catch (error: any) {
			throw new Error(`Failed to fetch markets: ${error}`);
		}
	}

	getMarketTokenId(market: Market, outcome: 'Yes' | 'No'): string {
		return market.tokens.find((t) => t.outcome === outcome)?.token_id || '';
	}

	async getTrades(params: TradeParams, only_first_page = false): Promise<Trade[]> {
		const logger = Logger.getInstance();

		try {
			await logger.log(`Fetching trades ...`);

			const trades = await this._client.getTrades(params, only_first_page);

			await logger.log(`Found ${trades.length} recent trades`);

			return trades;
		} catch (error: any) {
			throw new Error(`Failed to fetch trades: ${error}`);
		}
	}

	async getOpenOrders(params?: OpenOrderParams, only_first_page = false): Promise<OpenOrder[]> {
		const logger = Logger.getInstance();

		try {
			await logger.log(`Fetching open orders ...`);

			const openOrders = await this._client.getOpenOrders(params, only_first_page);

			await logger.log(`Found ${openOrders.length} open orders`);

			return openOrders;
		} catch (error: any) {
			throw new Error(`Failed to fetch open orders: ${error}`);
		}
	}

	async getOrder(orderId: string): Promise<OpenOrder> {
		const logger = Logger.getInstance();

		try {
			await logger.log(`Fetching order ${orderId} ...`);

			const order = await this._client.getOrder(orderId);

			return order;
		} catch (error: any) {
			throw new Error(`Failed to fetch order: ${error}`);
		}
	}

	async getOnchainPosition(tokenID: string): Promise<number> {
		const contract = new ethers.Contract(
			TOKENS_CONTRACT_ADDR,
			['function balanceOf(address,uint256) view returns (uint256)'],
			this._network?.getProvider(),
		);

		const position = await contract.balanceOf(FUNDER_ADDR, tokenID);

		return +ethers.formatUnits(position, 6);
	}

	async getPositions(): Promise<Position[]> {
		const positions = (
			await axios.get(
				`https://data-api.polymarket.com/positions?sizeThreshold=1&limit=500&sortBy=TOKENS&sortDirection=DESC&user=${FUNDER_ADDR}`,
			)
		).data;

		return positions;
	}

	async createLimitOrder(
		order: UserOrder,
		options?: Partial<CreateOrderOptions>,
		orderType: OrderType.GTC | OrderType.GTD = OrderType.GTC,
	): Promise<void> {
		const logger = Logger.getInstance();

		try {
			await logger.log(`Creating ${order.side} limit order: ${order.size} $${order.price}`);

			const response = await this._client.createAndPostOrder(order, options, orderType);

			console.log(response);

			// await logger.log(`Order created successfully! Order ID: ${response.orderID || 'N/A'}`);

			// if (response.transactionsHashes && response.transactionsHashes.length > 0) {
			// 	await logger.log(`Transaction hash: ${response.transactionsHashes[0]}`);
			// }
		} catch (error: any) {
			if (error.toString().includes('insufficient')) {
				throw new Error(`Insufficient balance to create order: ${error}`);
			}
			if (error.toString().includes('price') || error.toString().includes('tick')) {
				throw new Error(`Invalid price or tick size: ${error}`);
			}
			throw new Error(`Failed to create order: ${error}`);
		}
	}

	async createMarketOrder(
		order: UserMarketOrder,
		options?: Partial<CreateOrderOptions>,
		orderType: OrderType.FOK | OrderType.FAK = OrderType.FOK,
	): Promise<MarketOrderResponse> {
		const logger = Logger.getInstance();

		try {
			await logger.log(`Creating ${order.side} market order ${order.amount} sh...`);

			const response = await this._client.createAndPostMarketOrder(order, options, orderType);

			if (response.error) {
				throw new Error(`Failed to create order: ${response.error}`);
			}

			console.log(response);

			await logger.log(
				`Order created successfully!\n${response}\nTransaction: https://polygonscan.com/tx/${response.transactionsHashes[0]}`,
			);

			return response;
		} catch (error: any) {
			throw new Error(`Failed to create order: ${error}`);
		}
	}

	// /**
	//  * Cancel orders for an account
	//  * @param account Account with EVM wallet
	//  * @param params Cancellation parameters
	//  */
	// async cancelOrders(account: Account, params: PolymarketCancelOrdersParams): Promise<void> {
	// 	const logger = Logger.getInstance();

	// 	try {
	// 		if (params.cancelAll) {
	// 			await logger.log(`Cancelling ALL orders for ${account.name}...`);
	// 			await this._client.cancelAll();
	// 			await logger.log('All orders cancelled successfully');
	// 			return;
	// 		}

	// 		if (params.marketFilter) {
	// 			await logger.log(`Cancelling all orders for market ${params.marketFilter}...`);
	// 			await this._client.cancelMarketOrders({ market: params.marketFilter });
	// 			await logger.log('Market orders cancelled successfully');
	// 			return;
	// 		}

	// 		if (params.orderIDs && params.orderIDs.length > 0) {
	// 			await logger.log(`Cancelling ${params.orderIDs.length} specific orders...`);

	// 			for (const orderID of params.orderIDs) {
	// 				await this._client.cancelOrder({ orderID });
	// 				await logger.log(`Order ${orderID} cancelled`);
	// 			}

	// 			await logger.log('All specified orders cancelled successfully');
	// 			return;
	// 		}

	// 		await logger.log('No cancellation criteria specified', MessageType.Warn);
	// 	} catch (error: any) {
	// 		if (error.toString().includes('not found')) {
	// 			throw new Error(`Order not found or already cancelled: ${error}`);
	// 		}
	// 		throw new Error(`Failed to cancel orders: ${error}`);
	// 	}
	// }
}
