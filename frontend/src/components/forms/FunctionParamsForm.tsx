import * as React from 'react';
import {
	Paper,
	Typography,
	Alert,
	TextField,
	Checkbox,
	FormControlLabel,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	Button,
	Box,
	Grid,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import type { ActionParams } from '../../../../src/actions';
import type { ChainId, NetworkConfig } from '../../../../src/utils/network';
import type { JSX } from 'react';
import type { TokenConfig } from '../../../../src/utils/network/network';

/* ========================== базовые типы ========================== */

type FunctionParamsTree = Record<string, Record<string, any>>;

interface FormCtx {
	params: Record<string, any>;
	set: (name: string, value: any) => void;
	networks: NetworkConfig[];
	tokens: TokenConfig[];
}

/* ========================== утилиты ========================== */

const parseCsv = (s: string) =>
	s
		.split(/[,\s]+/)
		.map((t) => t.trim())
		.filter(Boolean);

const toNum = (v: string) => (v === '' ? undefined : Number.isNaN(Number(v)) ? undefined : Number(v));

function setParam(fp: FunctionParamsTree | undefined, actionParams: ActionParams, name: string, value: any): FunctionParamsTree {
	const root = fp ?? {};
	const byGroup = { ...(root[actionParams.group] ?? {}) };
	const byAction = { ...(byGroup[actionParams.action] ?? {}) };
	byAction[name] = value;
	byGroup[actionParams.action] = byAction;
	return { ...root, [actionParams.group]: byGroup };
}

/* ========================== маленькие поля (каждое — СВОЯ строка) ========================== */

function NumField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number | undefined;
	onChange: (v: number | undefined) => void;
}) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<TextField
				label={label}
				type="number"
				size="small"
				value={value ?? ''}
				onChange={(e) => onChange(toNum(e.target.value))}
			/>
		</Grid>
	);
}

function StrField({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: string | undefined;
	onChange: (v: string | undefined) => void;
	placeholder?: string;
}) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<TextField
				label={label}
				size="small"
				placeholder={placeholder}
				value={value ?? ''}
				onChange={(e) => onChange(e.target.value || undefined)}
			/>
		</Grid>
	);
}

function BoolField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<FormControlLabel
				control={<Checkbox checked={!!checked} onChange={(e) => onChange(e.target.checked)} />}
				label={label}
			/>
		</Grid>
	);
}

/** Блок-строка с двумя полями: from/to */
function RangeField({
	labelFrom,
	labelTo,
	value,
	onChange,
}: {
	labelFrom: string;
	labelTo: string;
	value: [number | undefined, number | undefined];
	onChange: (v: [number | undefined, number | undefined]) => void;
}) {
	const [a, b] = value ?? [];
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<Grid container spacing={2}>
				<Grid sx={{ xs: 12, md: 6 }}>
					<TextField
						label={labelFrom}
						type="number"
						size="small"
						fullWidth
						value={a ?? ''}
						onChange={(e) => onChange([toNum(e.target.value), b])}
					/>
				</Grid>
				<Grid sx={{ xs: 12, md: 6 }}>
					<TextField
						label={labelTo}
						type="number"
						size="small"
						fullWidth
						value={b ?? ''}
						onChange={(e) => onChange([a, toNum(e.target.value)])}
					/>
				</Grid>
			</Grid>
		</Grid>
	);
}

function CsvField({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: (string | number)[] | undefined;
	onChange: (v: (string | number)[] | undefined) => void;
	placeholder?: string;
}) {
	const initial = React.useMemo(() => (Array.isArray(value) ? value.join(', ') : ''), [JSON.stringify(value ?? [])]);
	const [text, setText] = React.useState(initial);
	React.useEffect(() => setText(initial), [initial]);

	const commit = () => {
		const parts = parseCsv(text);
		if (!parts.length) onChange(undefined);
		else {
			const allNums = parts.every((p) => /^-?\d+(\.\d+)?$/.test(p));
			onChange(allNums ? parts.map(Number) : parts);
		}
	};

	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<TextField
				label={label}
				size="small"
				placeholder={placeholder ?? 'a, b, c  |  1, 2, 3'}
				value={text}
				onChange={(e) => setText(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						commit();
						(e.currentTarget as HTMLInputElement).blur();
					}
				}}
			/>
		</Grid>
	);
}

function ChainIdSelect({
	label,
	value,
	onChange,
	networks,
}: {
	label: string;
	value: number | string | undefined;
	onChange: (v: ChainId) => void;
	networks: NetworkConfig[];
}) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<FormControl size="small">
				<InputLabel>{label}</InputLabel>
				<Select label={label} value={value} onChange={(e) => onChange(e.target.value as ChainId)}>
					{networks.map((n) => (
						<MenuItem key={String(n.chainId)} value={n.chainId}>
							{n.name}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Grid>
	);
}

function ChainIdMulti({
	label,
	value,
	onChange,
	networks,
}: {
	label: string;
	value: (number | string)[] | undefined;
	onChange: (v: (number | string)[] | undefined) => void;
	networks: NetworkConfig[];
}) {
	const vals = Array.isArray(value) ? value : [];
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<FormControl size="small">
				<InputLabel>{label}</InputLabel>
				<Select
					multiple
					label={label}
					value={vals as any}
					onChange={(e) => {
						const arr = e.target.value as (number | string)[];
						onChange(arr.length ? arr : undefined);
					}}
					renderValue={(vals) =>
						(vals as (number | string)[])
							.map((v) => networks.find((n) => String(n.chainId) === String(v))?.name ?? String(v))
							.join(', ')
					}
				>
					{networks.map((n) => (
						<MenuItem key={String(n.chainId)} value={n.chainId}>
							{n.name}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Grid>
	);
}

/* ========================== формы по actions ========================== */
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
			<ChainIdSelect
				label="Из сети"
				value={params.fromChainId}
				onChange={(v) => set('fromChainId', v)}
				networks={networks}
			/>
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
			<ChainIdMulti label="В сети" value={params.toChainIds} onChange={(v) => set('toChainIds', v)} networks={networks} />
		</Grid>
	);
}

function Form_Common_RefuelManyGasZip({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<ChainIdSelect
				label="Из сети"
				value={params.fromChainId}
				onChange={(v) => set('fromChainId', v)}
				networks={networks}
			/>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<ChainIdMulti label="В сети" value={params.toChainIds} onChange={(v) => set('toChainIds', v)} networks={networks} />
			<CsvField label="Адреса" value={params.addresses} onChange={(v) => set('addresses', v)} />
		</Grid>
	);
}

function Form_Common_RefuelRelayLink({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<ChainIdSelect
				label="Из сети"
				value={params.fromChainId}
				onChange={(v) => set('fromChainId', v)}
				networks={networks}
			/>
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
			<ChainIdSelect label="в сеть" value={params.toChainId} onChange={(v) => set('toChainId', v)} networks={networks} />
		</Grid>
	);
}

function Form_Common_RefuelManyRelayLink({ params, set, networks }: FormCtx) {
	return (
		<Grid container spacing={2}>
			<ChainIdSelect
				label="Из сети"
				value={params.fromChainId}
				onChange={(v) => set('fromChainId', v)}
				networks={networks}
			/>
			<RangeField
				labelFrom="Количество от"
				labelTo="Количество до"
				value={params.amount}
				onChange={(v) => set('amount', v)}
			/>
			<ChainIdSelect label="В сеть" value={params.toChainId} onChange={(v) => set('toChainId', v)} networks={networks} />
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
			<CsvField label="Биржи" value={params.exchanges} onChange={(v) => set('exchanges', v)} />
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
			<StrField label="Антидетект браузер" value={params.browser} onChange={(v) => set('browser', v)} />
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
		<StrField label="Антидетект браузер" value={params.browser} onChange={(v) => set('browser', v)} />
		<BoolField
			label="Закрыть браузер после выполнения"
			checked={params.closeBrowser}
			onChange={(v) => set('closeBrowser', v)}
		/>
	</Grid>
);

const Form_CommonUi_LoginInMetamask = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<StrField label="Антидетект браузер" value={params.browser} onChange={(v) => set('browser', v)} />
	</Grid>
);

const Form_CommonUi_RestorePetra = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_RestoreBackpack = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_RestoreArgent = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_RestoreRabby = Form_CommonUi_RestoreMetamask;
const Form_CommonUi_LoginInRabby = Form_CommonUi_LoginInMetamask;

/* -------- AdsPower / Vision -------- */

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

/* -------- Opensea -------- */

const Form_Opensea_SweepByLink = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<StrField label="Антидетект браузер" value={params.browser} onChange={(v) => set('browser', v)} />
		<CsvField label="Ссылки на коллекции" value={params.links} onChange={(v) => set('links', v)} />
		<NumField label="Сколько NFT купить" value={params.count} onChange={(v) => set('count', v ?? 0)} />
	</Grid>
);

const Form_Opensea_SellCollectionByLink = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<StrField label="Антидетект браузер" value={params.browser} onChange={(v) => set('browser', v)} />
		<StrField label="Ссылка на коллекцию" value={params.link} onChange={(v) => set('link', v)} />
	</Grid>
);

const Form_Opensea_ClaimUi = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<StrField label="Антидетект браузер" value={params.browser} onChange={(v) => set('browser', v)} />
	</Grid>
);

/* -------- / ZksyncLite -------- */

const Form_ZksyncLite_SendToken = ({ params, set }: FormCtx) => (
	<Grid container spacing={2}>
		<StrField label="Куда" value={params.to} onChange={(v) => set('to', v)} />
	</Grid>
);

/* ========================== роутер форм ========================== */

const FORMS: Record<string, (ctx: FormCtx) => JSX.Element> = {
	// Common
	'Common.CheckBalances': Form_Common_CheckBalances,
	'Common.GenerateWallets': Form_Common_GenerateWallets,
	'Common.RefuelGasZip': Form_Common_RefuelGasZip,
	'Common.RefuelManyGasZip': Form_Common_RefuelManyGasZip,
	'Common.RefuelRelayLink': Form_Common_RefuelRelayLink,
	'Common.RefuelManyRelayLink': Form_Common_RefuelManyRelayLink,

	// Evm
	'Evm.SendToken': Form_Evm_SendToken,
	'Evm.CheckNft': Form_Evm_CheckNft,
	'Evm.Wrap': Form_Evm_Wrap,
	'Evm.Unwrap': Form_Evm_Unwrap,
	'Evm.Approve': Form_Evm_Approve,
	'Evm.MakeTransaction': Form_Evm_MakeTransaction,

	// Svm
	'Svm.SendToken': Form_Svm_SendToken,

	// Odos
	'Odos.Swap': Form_Odos_Swap,

	// Exchanges
	'Exchanges.Withdraw': Form_Exchanges_Withdraw,

	// CEX withdraws (ChainId)
	'Okx.Withdraw': Form_ExchangeWithdraw_ChainId,
	'Bitget.Withdraw': Form_ExchangeWithdraw_ChainId,
	'Gate.Withdraw': Form_ExchangeWithdraw_ChainId,
	'Binance.Withdraw': Form_ExchangeWithdraw_ChainId,
	'Bybit.Withdraw': Form_ExchangeWithdraw_ChainId,

	// CommonUi
	'CommonUi.OpenPages': Form_CommonUi_OpenPages,
	'CommonUi.RestoreMetamask': Form_CommonUi_RestoreMetamask,
	'CommonUi.LoginInMetamask': Form_CommonUi_LoginInMetamask,
	'CommonUi.RestorePetra': Form_CommonUi_RestorePetra,
	'CommonUi.RestoreBackpack': Form_CommonUi_RestoreBackpack,
	'CommonUi.RestoreArgent': Form_CommonUi_RestoreArgent,
	'CommonUi.RestoreRabby': Form_CommonUi_RestoreRabby,
	'CommonUi.LoginInRabby': Form_CommonUi_LoginInRabby,

	// AdsPower / Vision
	'AdsPower.GetProfiles': Form_AdsPower_GetProfiles,
	'Vision.GetProfiles': Form_Vision_GetProfiles,

	// Opensea
	'Opensea.SweepByLink': Form_Opensea_SweepByLink,
	'Opensea.SellCollectionByLink': Form_Opensea_SellCollectionByLink,
	'Opensea.ClaimUi': Form_Opensea_ClaimUi,

	// ZksyncLite
	'ZksyncLite.SendToken': Form_ZksyncLite_SendToken,
};

/* ========================== корневой компонент ========================== */

export default function FunctionParamsForm({
	actionParams,
	functionParams,
	onChange,
	networks,
	tokens,
}: {
	actionParams: ActionParams;
	functionParams: FunctionParamsTree | undefined;
	networks: NetworkConfig[];
	tokens: TokenConfig[];
	onChange: (next: FunctionParamsTree) => void;
}) {
	const group = actionParams.group;
	const action = actionParams.action;
	const params: Record<string, any> | undefined = group && action ? functionParams?.[group]?.[action] : undefined;

	const set = (name: string, value: any) => onChange(setParam(functionParams, actionParams, name, value));

	const key = `${group}.${action}`;
	const Form = params ? FORMS[key] : undefined;

	return (
		<Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
			<Typography variant="h6" gutterBottom>
				Параметры действия
			</Typography>

			{!group || !action ? (
				<Alert severity="info">Выбери действие слева.</Alert>
			) : !params ? (
				<Alert severity="success">
					Для «{group}.{action}» параметры не требуются.
				</Alert>
			) : !Form ? (
				<Alert severity="warning">
					Форма для «{group}.{action}» пока не реализована.
				</Alert>
			) : (
				<Form params={params} set={set} networks={networks} tokens={tokens} />
			)}
		</Paper>
	);
}
