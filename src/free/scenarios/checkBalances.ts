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
import fs from 'fs';
import path from 'path';
import { StandardState } from '@src/utils/state/standardState.interface';
import { LaunchParams } from '@src/utils/types/launchParams.type';
import { checkTaskCancellation } from '@src/utils/taskExecutor';
import { getCurrentStateName } from '@src/utils/stateManager';

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
	launchParams: LaunchParams,
	accounts: Account[],
	params: {
		networks: {
			chainId: ChainId;
			tokenNames: string[];
			tokenAlert: { symbol: string; less: boolean; amountAlert: number };
		}[];
	},
	cmcApiKey?: string,
) {
	const stateName = getCurrentStateName();
	if (!stateName) throw new Error('stateName');
	const time = new Date().toISOString().replaceAll(':', '-');
	const allNetworks = await Promise.all(params.networks.map((a) => a.chainId).map((a) => Network.getNetworkByChainId(a)));
	const excelFileName = `balances/${allNetworks.map((a) => a.name).join('_')}/${time}`;

	for (const paramsNetwork of params.networks) {
		if (!paramsNetwork.tokenNames || paramsNetwork.tokenNames.length === 0)
			throw new Error(`There is no tokens in ${paramsNetwork.chainId}!`);

		const network = await Network.getNetworkByChainId(paramsNetwork.chainId);

		if (
			paramsNetwork.tokenAlert &&
			paramsNetwork.tokenAlert.symbol &&
			!paramsNetwork.tokenNames.includes(paramsNetwork.tokenAlert.symbol)
		)
			throw new Error(`There is no ${paramsNetwork.tokenAlert.symbol} in tokenNames in ${network.name}!`);
		const logger = Logger.getInstance();

		let svmApi: SvmApi | undefined;
		if (Network.isSvm(network.chainId)) svmApi = new SvmApi(network);

		const networkTokens = network.tokens.filter((t) =>
			paramsNetwork.tokenNames.some((tt) => tt === t.symbol),
		) as NetworkToken[];
		if (networkTokens.length !== paramsNetwork.tokenNames.length)
			throw new Error(
				`There is no ${paramsNetwork.tokenNames.filter((t) => !networkTokens.some((tt) => tt.symbol === t))} in tokens.json in ${network.name}!`,
			);

		await networkTokens.forEach(async (t) => {
			if (t.symbol === 'USDC.e') t.symbol = 'USDC';
			if (t.symbol === 'USDT.e') t.symbol = 'USDT';
			t.decimals = svmApi ? await svmApi.getDecimals(t) : await Evm.getDecimals(network, t);
		});

		const jsonStateName = `balances/${network.name}/${time}`;
		const state = StateStorage.load<BalanceState>(jsonStateName, {
			defaultState: {
				tokensPrices: [],
				sumTokensBalances: [],
				tokenAlert: undefined,
				tokensBalances: [],
			},
			rootDir: './',
			readable: true,
			fileExt: '.json',
		});

		if (cmcApiKey)
			state.tokensPrices = await CoinMarketCap.getTokensPrices(
				networkTokens.map((t) => t.symbol),
				cmcApiKey,
			);
		else {
			await logger.log(
				`There is no cmcApiKey. Fill it in secretStorage.jsonc for getting tokens prices.`,
				MessageType.Warn,
			);
			state.tokensPrices = networkTokens.map((t) => {
				return { symbol: t.symbol, price: 0 };
			});
		}

		for (const account of accounts) {
			const stateName = getCurrentStateName();
			if (stateName) checkTaskCancellation(stateName);
			if (!account.name) throw new Error(`There is no account.name!`);
			while (true) {
				try {
					const tokenBalances: TokenBalance[] = [];

					for (const token of networkTokens) {
						const network = await Network.getNetworkByChainId(paramsNetwork.chainId);

						let balance: string | undefined;

						if (Network.isEvm(paramsNetwork.chainId)) {
							if (!account.wallets?.evm?.address) throw new MissingFieldError(`wallets.evm.address`);
							const provider = network.getProvider();
							if (token.symbol === network.nativeCoin) {
								balance = ethers.formatUnits(
									await provider.getBalance(account.wallets.evm.address),
									token.decimals,
								);
							} else {
								const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
								balance = ethers.formatUnits(
									(await contract.balanceOf(account.wallets.evm.address)).toString(),
									token.decimals,
								);
							}
						} else if (Network.isSvm(paramsNetwork.chainId) && svmApi) {
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
							sumTokenBalance.balanceInUsd = (+sumTokenBalance.balanceInUsd + +tokenBalance.balanceInUsd).toFixed(
								2,
							);
						}
					}

					if (paramsNetwork.tokenAlert && paramsNetwork.tokenAlert.symbol) {
						const tokenBalance = tokenBalances.find((tb) => tb.token.symbol === paramsNetwork.tokenAlert.symbol);
						if (!tokenBalance) throw new Error(`There is no tokenBalance for tokenAlert!`);

						if (
							paramsNetwork.tokenAlert.less
								? +tokenBalance.balance < paramsNetwork.tokenAlert.amountAlert
								: +tokenBalance.balance > paramsNetwork.tokenAlert.amountAlert
						) {
							const alertState = state.tokenAlert;
							if (alertState) {
								alertState.alertAccounts.push(account.name);
							} else {
								state.tokenAlert = {
									symbol: paramsNetwork.tokenAlert.symbol,
									less: paramsNetwork.tokenAlert.less,
									amountAlert: paramsNetwork.tokenAlert.amountAlert,
									alertAccounts: [account.name],
								};
							}
						}
					}

					const message = tokenBalances.map(
						(tb) => ` | ${tb.token.symbol}: ${(+tb.balance).toFixed(5)} (${(+tb.balanceInUsd).toFixed(2)}$)`,
					);
					await logger.log(
						`${account.name} ${message} (${getExplorerUrl(paramsNetwork.chainId, account)})`,
						state.tokenAlert && state.tokenAlert.alertAccounts.includes(account.name)
							? MessageType.Warn
							: MessageType.Trace,
					);
					state.save();
					break;
				} catch (e: any) {
					if (e.toString().includes('MissingFieldError')) {
						throw e;
					} else {
						await Logger.getInstance().log(`Error: ${e}. Trying again...`, MessageType.Warn);
						await delay(5);
					}
				}
			}
		}

		await saveToExcel(state, network.name, excelFileName);

		const finalMessage = state.sumTokensBalances
			.map((s) => `${s.token}: ${(+s.balance).toFixed(5)} (${(+s.balanceInUsd).toFixed(2)}$)`)
			.join(' | ');
		await logger.log(
			`Balances for ${network.name}: ` +
				finalMessage +
				`\nData for ${network.name} saved to ${jsonStateName}.json and states/${excelFileName}.xlsx\n`,
			MessageType.Info,
		);
	}

	const message = `Balances for all networks (${allNetworks.map((a) => a.name).join(', ')}) checked and saved to ${excelFileName}.xlsx\n`;

	await Logger.getInstance().log(message, MessageType.Notice);

	const state = await StateStorage.load<StandardState>(stateName);
	state.info = message;
	state.save();
}

async function saveToExcel(state: State<BalanceState>, networkName: string, stateName: string) {
	const workbook = new Workbook();
	if (fs.existsSync(`${stateName}.xlsx`)) {
		await workbook.xlsx.readFile(`states/${stateName}.xlsx`);
	}

	const worksheet = workbook.addWorksheet(networkName);
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

	const fullpath = `${stateName}.xlsx`;
	fs.mkdirSync(path.dirname(fullpath), { recursive: true });
	await workbook.xlsx.writeFile(fullpath);
}

export interface TokenBalance {
	token: Token;
	balance: string;
	balanceInUsd: string;
}
