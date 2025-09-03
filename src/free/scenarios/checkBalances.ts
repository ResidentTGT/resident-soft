import { Account } from '@utils/account';
import { Logger, MessageType } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network, Token } from '@utils/network';
import { delay } from '@utils/delay';
import { ethers } from 'ethers';
import { State, StateStorage } from '@utils/state';
import { CoinMarketCap, TokenPrice } from '@freeModules/coinMarketCap';
import { ERC20_ABI } from '@utils/abi';
import { SvmApi } from '@src/free/modules/svmApi';
import { getExplorerUrl } from '@src/utils/getExplorerUrl';
import { Workbook } from 'exceljs';
import { MissingFieldError } from '@src/utils/errors';

interface NetworkToken extends Token {
	decimals: number;
}

interface BalanceState {
	sumTokensBalances: { token: string; balance: string; balanceInUsd: string }[];
	tokensPrices: TokenPrice[];
	tokenAlert?: { symbol: string; less: boolean; amountAlert: number; alertAccounts: string[] };
	tokensBalances: { account: string; balances: { token: string; balance: string; balanceInUsd: string }[] }[];
}

export async function checkBalances(
	chainId: ChainId,
	accounts: Account[],
	tokens: string[],
	stateName: string,
	cmcApiKey?: string,
	tokenAlert?: { symbol: string; less: boolean; amountAlert: number },
) {
	if (!tokens || tokens.length === 0) throw new Error(`There is no tokens!`);
	if (tokenAlert && !tokens.includes(tokenAlert.symbol)) throw new Error(`There is no ${tokenAlert.symbol} in tokens array!`);
	const logger = Logger.getInstance();

	const network = await Network.getNetworkByChainId(chainId);

	let svmApi: SvmApi | undefined;
	if (Network.isSvm(chainId)) svmApi = new SvmApi(network);

	const networkTokens = network.tokens.filter((t) => tokens.some((tt) => tt === t.symbol)) as NetworkToken[];
	if (networkTokens.length !== tokens.length)
		throw new Error(`There is no ${tokens.filter((t) => !networkTokens.some((tt) => tt.symbol === t))} in tokens.json!`);

	await networkTokens.forEach(async (t) => {
		if (t.symbol === 'USDC.e') t.symbol = 'USDC';
		if (t.symbol === 'USDT.e') t.symbol = 'USDT';
		t.decimals = svmApi ? await svmApi.getDecimals(t) : await Evm.getDecimals(network, t);
	});

	const state = StateStorage.load<BalanceState>(stateName, {
		defaultState: {
			tokensPrices: [],
			sumTokensBalances: [],
			tokenAlert: undefined,
			tokensBalances: [],
		},
		readable: true,
		fileExt: '.json',
	});

	if (cmcApiKey)
		state.tokensPrices = await CoinMarketCap.getTokensPrices(
			networkTokens.map((t) => t.symbol),
			cmcApiKey,
		);
	else {
		await logger.log(`There is no cmcApiKey. Fill it in secretStorage.jsonc for getting tokens prices.`, MessageType.Warn);
		state.tokensPrices = networkTokens.map((t) => {
			return { symbol: t.symbol, price: 0 };
		});
	}

	for (const account of accounts) {
		if (!account.name) throw new Error(`There is no account.name!`);
		while (true) {
			try {
				const tokenBalances: TokenBalance[] = [];

				for (const token of networkTokens) {
					const network = await Network.getNetworkByChainId(chainId);

					let balance: string | undefined;

					if (Network.isEvm(chainId)) {
						if (!account.wallets?.evm?.address) throw new MissingFieldError(`wallets.evm.address`);
						const provider = network.getProvider();
						if (token.symbol === network.nativeCoin) {
							balance = ethers.formatUnits(await provider.getBalance(account.wallets.evm.address), token.decimals);
						} else {
							const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
							balance = ethers.formatUnits(
								(await contract.balanceOf(account.wallets.evm.address)).toString(),
								token.decimals,
							);
						}
					} else if (Network.isSvm(chainId) && svmApi) {
						if (!account.wallets?.solana?.address) throw new MissingFieldError(`wallets.solana.address`);
						balance = ethers.formatUnits(
							await svmApi.getBalance(account.wallets.solana.address, token.symbol),
							token.decimals,
						);
					}
					if (!balance) throw new Error(`There is no balance!`);

					const tokenPrice = state.tokensPrices.find((t) => t.symbol === token.symbol);
					if (!tokenPrice) throw new Error(`There is no tokenPrice!`);
					const balanceInUsd = (+balance * tokenPrice.price).toString();

					tokenBalances.push({
						token,
						balance,
						balanceInUsd,
					});
				}

				state.tokensBalances.push({
					account: account.name,
					balances: tokenBalances.map((tb) => {
						return {
							token: tb.token.symbol,
							balance: (+tb.balance).toFixed(5),
							balanceInUsd: (+tb.balanceInUsd).toFixed(2),
						};
					}),
				});

				for (const tokenBalance of tokenBalances) {
					const sumTokenBalance = state.sumTokensBalances.find((stb) => stb.token === tokenBalance.token.symbol);
					if (!sumTokenBalance) {
						state.sumTokensBalances.push({
							token: tokenBalance.token.symbol,
							balance: tokenBalance.balance,
							balanceInUsd: tokenBalance.balanceInUsd,
						});
					} else {
						sumTokenBalance.balance = (+sumTokenBalance.balance + +tokenBalance.balance).toFixed(5);
						sumTokenBalance.balanceInUsd = (+sumTokenBalance.balanceInUsd + +tokenBalance.balanceInUsd).toFixed(2);
					}
				}

				if (tokenAlert) {
					const tokenBalance = tokenBalances.find((tb) => tb.token.symbol === tokenAlert.symbol);
					if (!tokenBalance) throw new Error(`There is no tokenBalance for tokenAlert!`);

					if (
						tokenAlert.less
							? +tokenBalance.balance < tokenAlert.amountAlert
							: +tokenBalance.balance > tokenAlert.amountAlert
					) {
						const alertState = state.tokenAlert;
						if (alertState) {
							alertState.alertAccounts.push(account.name);
						} else {
							state.tokenAlert = {
								symbol: tokenAlert.symbol,
								less: tokenAlert.less,
								amountAlert: tokenAlert.amountAlert,
								alertAccounts: [account.name],
							};
						}
					}
				}

				const message = tokenBalances.map(
					(tb) => ` | ${tb.token.symbol}: ${(+tb.balance).toFixed(5)} (${(+tb.balanceInUsd).toFixed(2)}$)`,
				);
				await logger.log(
					`${account.name} ${message} (${getExplorerUrl(chainId, account)})`,
					state.tokenAlert && state.tokenAlert.alertAccounts.includes(account.name)
						? MessageType.Warn
						: MessageType.Trace,
				);
				state.save();
				break;
			} catch (e) {
				await Logger.getInstance().log(`Error: ${e}. Trying again...`, MessageType.Warn);
				await delay(5);
			}
		}
	}

	await saveToExcel(state, stateName);

	const finalMessage = state.sumTokensBalances
		.map((s) => `${s.token}: ${(+s.balance).toFixed(5)} (${(+s.balanceInUsd).toFixed(2)}$)`)
		.join(' | ');
	await logger.log(finalMessage + `\nData saved to states/${stateName}.json`, MessageType.Notice);
}

async function saveToExcel(state: State<BalanceState>, stateName: string) {
	const workbook = new Workbook();
	const worksheet = workbook.addWorksheet('Balances');
	worksheet.columns = [
		{ header: 'Account', key: 'account', width: 15 },
		...state.tokensBalances[0].balances.map((t) => {
			return { header: t.token, key: t.token, width: 15 };
		}),
	];

	state.tokensBalances.forEach((p: any) => {
		for (const balance of p.balances) p[balance.token] = `${balance.balance} (${balance.balanceInUsd}$)`;
		worksheet.addRow(p);
	});
	const sumRaw = worksheet.addRow({
		account: 'SUM',
		...state.sumTokensBalances.reduce((a, b) => ({ ...a, [b.token]: `${b.balance} (${b.balanceInUsd}$)` }), {}),
	});

	worksheet.eachRow((row) => {
		row.font = { name: 'Calibri', size: 11 };
	});
	sumRaw.font.color = { argb: 'FF800080' };
	worksheet.getRow(1).font.bold = true;

	const path = `states/${stateName}.xlsx`;
	await workbook.xlsx.writeFile(path);
}

export interface TokenBalance {
	token: Token;
	balance: string;
	balanceInUsd: string;
}
