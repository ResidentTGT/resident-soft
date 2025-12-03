import { FormControl, InputLabel, Select, MenuItem, Stack, Button, Box, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import { ActionName, ActionsGroupName } from '../../../../src/actions';

import type { FormCtx } from './FunctionParamsForm';
import { NumField } from './fields/NumField';
import { RangeField } from './fields/RangeField';
import { BoolField } from './fields/BoolField';
import { CsvField } from './fields/CsvField';
import { StrField } from './fields/StrField';
import { ChainIdSelect } from './fields/ChainIdSelect';
import { ChainIdMultiSelect } from './fields/ChainIdMultiSelect';
import { ChainId } from '../../../../src/utils/network/chainId';
import { BrowserField } from './fields/BrowserField';

/* -------- Browser Form -------- */
const Form_Browser = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
	</Grid>
);

/* -------- Common -------- */

function Form_Common_CheckBalances({ params, set, networks, tokens }: FormCtx) {
	const arr: any[] = Array.isArray(params.networks) ? params.networks : [];
	const add = () => {
		const blank = {
			chainId: networks[0]?.chainId,
			tokenNames: [],
			tokenAlert: { symbol: '', less: false, amountAlert: 0 },
		};
		set('networks', [...arr, blank]);
	};
	const remove = (i: number) => {
		const next = [...arr];
		next.splice(i, 1);
		set('networks', next.length ? next : undefined);
	};

	const changeTokens = (e: any, net: any, i: any) => {
		const arrSel = (e.target.value as string[]) ?? [];
		const next = [...arr];
		next[i] = { ...net, tokenNames: arrSel };
		set('networks', next);
	};

	return (
		<Grid container spacing={2}>
			<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Button size="small" startIcon={<AddIcon />} onClick={add}>
						Добавить сеть
					</Button>
				</Stack>
			</Grid>

			{arr.map((net, i) => {
				const netTokens = tokens.find((t) => t.chainId === net.chainId)?.tokens;
				const filteredSelectedTokens = net.tokenNames.filter((tn: any) => netTokens?.some((t) => t.symbol === tn));
				if (filteredSelectedTokens.length === 0) {
					changeTokens({ target: { value: [netTokens?.map((t) => t.symbol)[0]] } }, net, i);
				} else {
					if (filteredSelectedTokens.length !== net.tokenNames.length) {
						changeTokens({ target: { value: filteredSelectedTokens } }, net, i);
					}
				}
				return (
					<Grid sx={{ xs: 12 }} key={i}>
						<Box sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2 }}>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
								<Button size="small" startIcon={<DeleteIcon />} onClick={() => remove(i)}>
									Удалить сеть
								</Button>
							</Stack>

							<Grid container spacing={2}>
								<ChainIdSelect
									label="Сеть"
									value={net.chainId}
									onChange={(v) => {
										const next = [...arr];
										next[i] = { ...net, chainId: v };
										set('networks', next);
									}}
									networks={networks}
								/>

								<FormControl size="small">
									<InputLabel>Токены</InputLabel>
									<Select
										multiple
										label="Токены"
										value={filteredSelectedTokens}
										onChange={(e) => {
											changeTokens(e, net, i);
										}}
										renderValue={(vals) => (vals as string[]).join(', ')}
									>
										{tokens
											.find((t) => String(t.chainId) === String(net.chainId))
											?.tokens.map((t) => (
												<MenuItem key={String(t.symbol)} value={String(t.symbol)}>
													{String(t.symbol)}
												</MenuItem>
											))}
									</Select>
								</FormControl>
							</Grid>
						</Box>
					</Grid>
				);
			})}
		</Grid>
	);
}

function Form_Common_GenerateWallets({ params, set }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<NumField label="Количество" value={params.amount} onChange={(v) => set('amount', v ?? 0)} />
		</Grid>
	);
}

function Form_Common_RefuelGasZip({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdSelect
					label="Из сети"
					value={params.fromChainId}
					onChange={(v) => set('fromChainId', v)}
					networks={networks}
				/>
			</Grid>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<RangeField
				labelFrom="Оставлять на балансе от"
				labelTo="Оставлять на балансе до"
				value={params.minBalanceToKeep}
				onChange={(v) => set('minBalanceToKeep', v)}
			/>
			<NumField label="Минимальная сумма" value={params.minAmountToSend} onChange={(v) => set('minAmountToSend', v ?? 0)} />
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdMultiSelect
					label="В сети"
					value={params.toChainIds}
					onChange={(v) => set('toChainIds', v)}
					networks={networks}
				/>
			</Grid>
		</Grid>
	);
}

function Form_Common_RefuelManyGasZip({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdSelect
					label="Из сети"
					value={params.fromChainId}
					onChange={(v) => set('fromChainId', v)}
					networks={networks}
				/>
			</Grid>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdMultiSelect
					label="В сети"
					value={params.toChainIds}
					onChange={(v) => set('toChainIds', v)}
					networks={networks}
				/>
			</Grid>
			<CsvField label="Адреса" value={params.addresses} onChange={(v) => set('addresses', v)} />
		</Grid>
	);
}

function Form_Common_RefuelRelayLink({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdSelect
					label="Из сети"
					value={params.fromChainId}
					onChange={(v) => set('fromChainId', v)}
					networks={networks}
				/>
			</Grid>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<RangeField
				labelFrom="Оставлять на балансе от"
				labelTo="Оставлять на балансе до"
				value={params.minBalanceToKeep}
				onChange={(v) => set('minBalanceToKeep', v)}
			/>
			<NumField label="Минимальная сумма" value={params.minAmountToSend} onChange={(v) => set('minAmountToSend', v ?? 0)} />
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdSelect
					label="в сеть"
					value={params.toChainId}
					onChange={(v) => set('toChainId', v)}
					networks={networks}
				/>
			</Grid>
		</Grid>
	);
}

function Form_Common_RefuelManyRelayLink({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdSelect
					label="Из сети"
					value={params.fromChainId}
					onChange={(v) => set('fromChainId', v)}
					networks={networks}
				/>
			</Grid>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdSelect
					label="В сеть"
					value={params.toChainId}
					onChange={(v) => set('toChainId', v)}
					networks={networks}
				/>
			</Grid>
			<CsvField label="Адреса" value={params.addresses} onChange={(v) => set('addresses', v)} />
		</Grid>
	);
}

/* -------- Evm -------- */

function Form_Evm_SendToken({ params, set, networks, tokens }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<ChainIdSelect
				label="Из сети"
				value={params.fromChainId}
				onChange={(v) => set('fromChainId', v)}
				networks={networks}
			/>
			<FormControl size="small">
				<InputLabel>Токен</InputLabel>
				<Select
					label="Токен"
					value={params.token ?? ''}
					onChange={(e) => set('token', (e.target.value as string) || undefined)}
				>
					{(tokens.find((g) => String(g.chainId) === String(params.fromChainId))?.tokens ?? []).map((tok) => (
						<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
							{String(tok.symbol)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<RangeField
				labelFrom="Оставлять на балансе от"
				labelTo="Оставлять на балансе до"
				value={params.minBalanceToKeep}
				onChange={(v) => set('minBalanceToKeep', v)}
			/>
			<NumField label="Минимальная сумма" value={params.minAmountToSend} onChange={(v) => set('minAmountToSend', v ?? 0)} />
			<StrField label="Куда" value={params.to} onChange={(v) => set('to', v)} />
		</Grid>
	);
}

const Form_Evm_CheckNft = ({ params, set, networks }: FormCtx) => (
	<Grid container spacing={2}>
		<ChainIdSelect label="Сеть" value={params.chainId} onChange={(v) => set('chainId', v)} networks={networks} />
		<StrField label="Адрес контаркта NFT" value={params.nftContract} onChange={(v) => set('nftContract', v)} />
	</Grid>
);

const Form_Evm_Wrap = ({ params, set, networks }: FormCtx) => (
	<Grid container spacing={2}>
		<ChainIdSelect label="Сеть" value={params.chainId} onChange={(v) => set('chainId', v)} networks={networks} />
		<RangeField labelFrom="Количество от" labelTo="Количество до" value={params.amount} onChange={(v) => set('amount', v)} />
	</Grid>
);

const Form_Evm_Unwrap = Form_Evm_Wrap;

function Form_Evm_Approve({ params, set, networks, tokens }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<ChainIdSelect label="Сеть" value={params.chainId} onChange={(v) => set('chainId', v)} networks={networks} />
			<FormControl size="small">
				<InputLabel>Токен</InputLabel>
				<Select
					label="Токен"
					value={params.tokenSymbol ?? ''}
					onChange={(e) => set('tokenSymbol', (e.target.value as string) || undefined)}
				>
					{(tokens.find((g) => String(g.chainId) === String(params.chainId))?.tokens ?? []).map((tok) => (
						<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
							{String(tok.symbol)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<StrField label="Spender" value={params.spender} onChange={(v) => set('spender', v)} />
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
		</Grid>
	);
}

function Form_Evm_MakeTransaction({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<ChainIdSelect label="Сеть" value={params.chainId} onChange={(v) => set('chainId', v)} networks={networks} />
			<StrField label="Адрес контаркта" value={params.contractAddress} onChange={(v) => set('contractAddress', v)} />
			<StrField label="Data" value={params.data} onChange={(v) => set('data', v)} />
			<NumField label="Value" value={params.value} onChange={(v) => set('value', v ?? 0)} />
		</Grid>
	);
}

/* -------- Svm -------- */

const Form_Svm_SendToken = ({ params, set, networks, tokens }: FormCtx) => (
	<Grid container spacing={2}>
		<ChainIdSelect label="Сеть" value={params.chainId} onChange={(v) => set('chainId', v)} networks={networks} />
		<FormControl size="small">
			<InputLabel>Токен</InputLabel>
			<Select
				label="Токен"
				value={params.token ?? ''}
				onChange={(e) => set('token', (e.target.value as string) || undefined)}
			>
				{(tokens.find((g) => String(g.chainId) === String(params.chainId))?.tokens ?? []).map((tok) => (
					<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
						{String(tok.symbol)}
					</MenuItem>
				))}
			</Select>
		</FormControl>
		<RangeField labelFrom="Количество от" labelTo="Количество до" value={params.amount} onChange={(v) => set('amount', v)} />
		<RangeField
			labelFrom="Оставлять на балансе от"
			labelTo="Оставлять на балансе до"
			value={params.minBalanceToKeep}
			onChange={(v) => set('minBalanceToKeep', v)}
		/>
		<NumField label="Минимальная сумма" value={params.minAmountToSend} onChange={(v) => set('minAmountToSend', v ?? 0)} />
		<StrField label="Куда" value={params.to} onChange={(v) => set('to', v)} />
	</Grid>
);

/* -------- Odos -------- */

function Form_Odos_Swap({ params, set, networks, tokens }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<ChainIdSelect label="Сеть" value={params.chainId} onChange={(v) => set('chainId', v)} networks={networks} />
			<FormControl size="small">
				<InputLabel>Из токена</InputLabel>
				<Select
					label="Из токена"
					value={params.token1 ?? ''}
					onChange={(e) => set('token1', (e.target.value as string) || undefined)}
				>
					{(tokens.find((g) => String(g.chainId) === String(params.chainId))?.tokens ?? []).map((tok) => (
						<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
							{String(tok.symbol)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<FormControl size="small">
				<InputLabel>В токен</InputLabel>
				<Select
					label="В токен"
					value={params.token2 ?? ''}
					onChange={(e) => set('token2', (e.target.value as string) || undefined)}
				>
					{(tokens.find((g) => String(g.chainId) === String(params.chainId))?.tokens ?? []).map((tok) => (
						<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
							{String(tok.symbol)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<NumField label="Слиппедж в %" value={params.slippageInPercent} onChange={(v) => set('slippageInPercent', v ?? 0)} />
			<NumField
				label="Минимальная сумма"
				value={params.minAmountForSwap}
				onChange={(v) => set('minAmountForSwap', v ?? 0)}
			/>
		</Grid>
	);
}

/* -------- Exchanges (строковый toChainId) -------- */

function Form_Exchanges_Withdraw({ params, set, tokens, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<FormControl size="small">
				<InputLabel>Биржи</InputLabel>
				<Select
					multiple
					label="Биржи"
					value={Array.isArray(params.exchanges) ? params.exchanges : []}
					onChange={(e) => set('exchanges', (e.target.value as string[]) ?? [])}
					renderValue={(vals) => (vals as string[]).join(', ')}
				>
					<MenuItem value="Bitget">Bitget</MenuItem>
					<MenuItem value="Bybit">Bybit</MenuItem>
					<MenuItem value="Okx">Okx</MenuItem>
					<MenuItem value="Gate">Gate</MenuItem>
					<MenuItem value="Binance">Binance</MenuItem>
				</Select>
			</FormControl>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<FormControl size="small">
				<InputLabel>Токен</InputLabel>
				<Select
					label="Токен"
					value={params.token ?? ''}
					onChange={(e) => set('token', (e.target.value as string) || undefined)}
				>
					{(tokens.find((g) => String(g.chainId) === String(params.toChainId))?.tokens ?? []).map((tok) => (
						<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
							{String(tok.symbol)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<StrField label="Куда" value={params.to} onChange={(v) => set('to', v)} />
			<ChainIdSelect label="В сеть" value={params.toChainId} onChange={(v) => set('toChainId', v)} networks={networks} />
		</Grid>
	);
}

/* -------- централизованные Withdraw (ChainId) -------- */

function Form_ExchangeWithdraw_ChainId({ params, set, networks, tokens }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<FormControl size="small">
				<InputLabel>Токен</InputLabel>
				<Select
					label="Токен"
					value={params.token ?? ''}
					onChange={(e) => set('token', (e.target.value as string) || undefined)}
				>
					{(tokens.find((g) => String(g.chainId) === String(params.toChainId))?.tokens ?? []).map((tok) => (
						<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
							{String(tok.symbol)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<StrField label="Куда" value={params.to} onChange={(v) => set('to', v)} />
			<ChainIdSelect label="В сеть" value={params.toChainId} onChange={(v) => set('toChainId', v)} networks={networks} />
		</Grid>
	);
}

/* -------- CommonUi -------- */

function Form_CommonUi_OpenPages({ params, set }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
			<CsvField
				label="Ссылки на страницы"
				value={params.pageUrls}
				onChange={(v) => set('pageUrls', v)}
				placeholder="https://..., https://..."
			/>
			<BoolField
				label="Залогиниться в расширении Rabby"
				checked={params.loginInRabby}
				onChange={(v) => set('loginInRabby', v)}
			/>
			<BoolField
				label="Залогиниться в расширении Petra"
				checked={params.loginInPetra}
				onChange={(v) => set('loginInPetra', v)}
			/>
		</Grid>
	);
}

const Form_CommonUi_RestoreMetamask = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
		<BoolField
			label="Закрыть браузер после выполнения"
			checked={params.closeBrowser}
			onChange={(v) => set('closeBrowser', v)}
		/>
	</Grid>
);

const Form_CommonUi_RestorePetra = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_RestoreBackpack = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_RestoreArgent = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_RestoreRabby = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_RestorePhantom = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_LoginInRabby = Form_Browser;

/* -------- AdsPower / Vision / Afina -------- */

const Form_AdsPower_GetProfiles = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<NumField label="Количество" value={params.count} onChange={(v) => set('count', v ?? 0)} />
	</Grid>
);

const Form_Vision_GetProfiles = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<StrField label="API токен" value={params.token} onChange={(v) => set('token', v)} />
		<StrField label="Id папки с профилями" value={params.folderId} onChange={(v) => set('folderId', v)} />
	</Grid>
);

const Form_Afina_GetProfiles = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<StrField label="API ключ" value={params.apiKey} onChange={(v) => set('apiKey', v)} />
	</Grid>
);

/* -------- Opensea -------- */

const Form_Opensea_SweepByLink = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
		<CsvField label="Ссылки на коллекции" value={params.links} onChange={(v) => set('links', v)} />
		<NumField label="Сколько NFT купить" value={params.count} onChange={(v) => set('count', v ?? 0)} />
	</Grid>
);

const Form_Opensea_SellCollectionByLink = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
		<StrField label="Ссылка на коллекцию" value={params.link} onChange={(v) => set('link', v)} />
	</Grid>
);

/* -------- / ZksyncLite -------- */

const Form_ZksyncLite_SendToken = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<StrField label="Куда" value={params.to} onChange={(v) => set('to', v)} />
	</Grid>
);

/* -------- / Twitter -------- */

const Form_Twitter_Login = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
		<BoolField
			label="Закрыть браузер после выполнения"
			checked={params.closeBrowser}
			onChange={(v) => set('closeBrowser', v)}
		/>
	</Grid>
);

const Form_Twitter_Follow = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
		<CsvField label="Профили" value={params.profiles} onChange={(v) => set('profiles', v)} />
	</Grid>
);

const Form_Twitter_Post = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
		<StrField label="Пост" value={params.message} onChange={(v) => set('message', v)} />
	</Grid>
);

const Form_Twitter_QuoteReply = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
		<StrField label="Ссылка на твит" value={params.tweetUrl} onChange={(v) => set('tweetUrl', v)} />
		<StrField label="Сообщение" value={params.message} onChange={(v) => set('message', v)} />
	</Grid>
);

const Form_Twitter_LikeAndRetweet = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
		<CsvField label="Ссылки на твиты" value={params.urls} onChange={(v) => set('urls', v)} />
		<BoolField label="Сделать ретвит" checked={params.retweet} onChange={(v) => set('retweet', v)} />
	</Grid>
);

/* -------- / Superchain -------- */

const Form_Make_Transactions = ({ params, set, networks }: FormCtx) => {
	const allowedChains = [
		ChainId.Base,
		ChainId.Optimism,
		ChainId.Lisk,
		ChainId.Ink,
		ChainId.Soneium,
		ChainId.Mode,
		ChainId.World,
		ChainId.Unichain,
		ChainId.Celo,
	];
	const allowedNets = networks.filter((n) => allowedChains.includes(n.chainId));

	const allowedRefuelChains = [ChainId.Base, ChainId.Optimism, ChainId.Arbitrum, ChainId.Bsc, ChainId.Linea, ChainId.Polygon];
	const allowedRefuelNets = networks.filter((n) => allowedRefuelChains.includes(n.chainId));
	return (
		<Grid container spacing={2} width={'100%'}>
			<ChainIdMultiSelect
				label="В сетях"
				value={params.chainIds}
				onChange={(v) => set('chainIds', v)}
				networks={allowedNets}
			/>
			<BoolField label="Набивать до последнего бейджа" checked={params.forBadges} onChange={(v) => set('forBadges', v)} />
			{!params.forBadges && (
				<NumField label="Нужно транзакций на кошельке" value={params.count} onChange={(v) => set('count', v ?? 0)} />
			)}
			<Grid sx={{ minWidth: '30%' }}>
				<ChainIdSelect
					label="Рефьэл из сети"
					value={params.refuelFromChainId}
					onChange={(v) => set('refuelFromChainId', v)}
					networks={allowedRefuelNets}
				/>
			</Grid>
			<Grid sx={{ width: '100%' }}>Задержка между транзакциями, с.</Grid>
			<RangeField
				labelFrom="От"
				labelTo="До"
				value={params.delayBetweenTransactions}
				onChange={(v) => set('delayBetweenTransactions', v)}
			/>
		</Grid>
	);
};

/* -------- / Abstract -------- */

function Form_Abstract_RefuelGasZip({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<Grid sx={{ xs: 12, md: 6, width: 'auto' }}>
				<ChainIdSelect
					label="Из сети"
					value={params.fromChainId}
					onChange={(v) => set('fromChainId', v)}
					networks={networks}
				/>
			</Grid>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
		</Grid>
	);
}

function Form_Abstract_Swap({ params, set, tokens }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<BrowserField value={params.browser} onChange={(v) => set('browser', v)}></BrowserField>
			<FormControl size="small">
				<InputLabel>Из токена</InputLabel>
				<Select
					label="Из токена"
					value={params.fromToken ?? ''}
					onChange={(e) => set('fromToken', (e.target.value as string) || undefined)}
				>
					{(tokens.find((g) => String(g.chainId) === String(ChainId.Abstract))?.tokens ?? []).map((tok) => (
						<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
							{String(tok.symbol)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<FormControl size="small">
				<InputLabel>В токен</InputLabel>
				<Select
					label="В токен"
					value={params.toToken ?? ''}
					onChange={(e) => set('toToken', (e.target.value as string) || undefined)}
				>
					{(tokens.find((g) => String(g.chainId) === String(ChainId.Abstract))?.tokens ?? []).map((tok) => (
						<MenuItem key={String(tok.symbol)} value={String(tok.symbol)}>
							{String(tok.symbol)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
		</Grid>
	);
}

export const FORMS = {
	[ActionsGroupName.Common]: {
		[ActionName.CheckBalances]: Form_Common_CheckBalances,
		[ActionName.GenerateWallets]: Form_Common_GenerateWallets,
		[ActionName.RefuelGasZip]: Form_Common_RefuelGasZip,
		[ActionName.RefuelManyGasZip]: Form_Common_RefuelManyGasZip,
		[ActionName.RefuelRelayLink]: Form_Common_RefuelRelayLink,
		[ActionName.RefuelManyRelayLink]: Form_Common_RefuelManyRelayLink,
	},
	[ActionsGroupName.CommonUi]: {
		[ActionName.OpenPages]: Form_CommonUi_OpenPages,
		[ActionName.RestoreMetamask]: Form_CommonUi_RestoreMetamask,
		[ActionName.LoginInMetamask]: Form_Browser,
		[ActionName.RestorePetra]: Form_CommonUi_RestorePetra,
		[ActionName.RestoreBackpack]: Form_CommonUi_RestoreBackpack,
		[ActionName.RestoreArgent]: Form_CommonUi_RestoreArgent,
		[ActionName.RestoreRabby]: Form_CommonUi_RestoreRabby,
		[ActionName.LoginInRabby]: Form_CommonUi_LoginInRabby,
		[ActionName.RestorePhantom]: Form_CommonUi_RestorePhantom,
	},
	[ActionsGroupName.Evm]: {
		[ActionName.SendToken]: Form_Evm_SendToken,
		[ActionName.CheckNft]: Form_Evm_CheckNft,
		[ActionName.Wrap]: Form_Evm_Wrap,
		[ActionName.Unwrap]: Form_Evm_Unwrap,
		[ActionName.Approve]: Form_Evm_Approve,
		[ActionName.MakeTransaction]: Form_Evm_MakeTransaction,
	},
	[ActionsGroupName.Svm]: {
		[ActionName.SendToken]: Form_Svm_SendToken,
	},
	[ActionsGroupName.Odos]: {
		[ActionName.Swap]: Form_Odos_Swap,
	},
	[ActionsGroupName.Exchanges]: {
		[ActionName.Withdraw]: Form_Exchanges_Withdraw,
	},
	[ActionsGroupName.Vision]: {
		[ActionName.GetProfiles]: Form_Vision_GetProfiles,
	},
	[ActionsGroupName.AdsPower]: {
		[ActionName.GetProfiles]: Form_AdsPower_GetProfiles,
	},
	[ActionsGroupName.Opensea]: {
		[ActionName.SweepByLink]: Form_Opensea_SweepByLink,
		[ActionName.SellCollectionByLink]: Form_Opensea_SellCollectionByLink,
		[ActionName.ClaimUi]: Form_Browser,
	},
	[ActionsGroupName.ZksyncLite]: {
		[ActionName.SendToken]: Form_ZksyncLite_SendToken,
	},
	[ActionsGroupName.Meteora]: {
		[ActionName.AddLiquidity]: Form_Browser,
	},
	[ActionsGroupName.Okx]: {
		[ActionName.Withdraw]: Form_ExchangeWithdraw_ChainId,
	},
	[ActionsGroupName.Bitget]: {
		[ActionName.Withdraw]: Form_ExchangeWithdraw_ChainId,
	},
	[ActionsGroupName.Gate]: {
		[ActionName.Withdraw]: Form_ExchangeWithdraw_ChainId,
	},
	[ActionsGroupName.Binance]: {
		[ActionName.Withdraw]: Form_ExchangeWithdraw_ChainId,
	},
	[ActionsGroupName.Bybit]: {
		[ActionName.Withdraw]: Form_ExchangeWithdraw_ChainId,
	},
	[ActionsGroupName.Polymarket]: {
		[ActionName.ClaimUi]: Form_Browser,
	},

	[ActionsGroupName.Twitter]: {
		[ActionName.Login]: Form_Twitter_Login,
		[ActionName.LoginByToken]: Form_Twitter_Login,
		[ActionName.Follow]: Form_Twitter_Follow,
		[ActionName.Post]: Form_Twitter_Post,
		[ActionName.Quote]: Form_Twitter_QuoteReply,
		[ActionName.Reply]: Form_Twitter_QuoteReply,
		[ActionName.LikeAndRetweet]: Form_Twitter_LikeAndRetweet,
	},
	[ActionsGroupName.Superchain]: {
		[ActionName.MakeTransactions]: Form_Make_Transactions,
		[ActionName.ClaimUi]: Form_Browser,
	},
	[ActionsGroupName.Abstract]: {
		[ActionName.RegisterUi]: Form_Browser,
		[ActionName.RefuelGasZip]: Form_Abstract_RefuelGasZip,
		[ActionName.Vote]: Form_Browser,
		[ActionName.ConnectTwitter]: Form_Browser,
		[ActionName.Swap]: Form_Abstract_Swap,
		[ActionName.ClaimUi]: Form_Browser,
	},
	[ActionsGroupName.Afina]: {
		[ActionName.GetProfiles]: Form_Afina_GetProfiles,
	},
};
