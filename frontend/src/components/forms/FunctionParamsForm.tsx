import * as React from 'react';
import {
	Paper,
	Typography,
	Alert,
	Grid,
	TextField,
	Checkbox,
	FormControlLabel,
	Stack,
	Box,
	Button,
	IconButton,
	MenuItem,
	Select,
	InputLabel,
	FormControl,
	FormHelperText,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import type { ActionsGroupName, ActionName } from '../../../src/actions';
import type { NetworkConfig } from '../../../src/utils/network';

/** ---------- META ТИПЫ ДЛЯ РЕНДЕРА ---------- */
type FieldMeta =
	| { kind: 'string'; label: string; required?: boolean; placeholder?: string }
	| { kind: 'number'; label: string; required?: boolean; min?: number; max?: number; step?: number }
	| { kind: 'boolean'; label: string }
	| { kind: 'range'; labelMin: string; labelMax: string; required?: boolean; min?: number; max?: number; step?: number }
	| { kind: 'string[]'; label: string; placeholder?: string }
	| { kind: 'number[]'; label: string }
	| { kind: 'chainId'; label: string }
	| { kind: 'chainId[]'; label: string }
	| { kind: 'object'; label?: string; fields: Record<string, FieldMeta> }
	| {
			kind: 'array';
			label: string;
			of: Extract<
				FieldMeta,
				{ kind: 'object' | 'string' | 'number' | 'boolean' | 'range' | 'string[]' | 'number[]' | 'chainId' }
			>;
			minItems?: number;
			maxItems?: number;
			addLabel?: string;
	  };

type ActionSchema = Record<string, FieldMeta>;
type GroupSchema = Record<string, ActionSchema>;
type ParamSchemaRoot = Record<ActionsGroupName, GroupSchema>;

/** ---------- ХЕЛПЕРЫ ---------- */
const parseCsv = (s: string) =>
	s
		.split(/[,\s]+/)
		.map((t) => t.trim())
		.filter(Boolean);

const toNumberArray = (arr: string[]) => arr.map((x) => Number(x)).filter((v) => !Number.isNaN(v));

const rangeOrUndef = (a?: number, b?: number): [number, number] | undefined =>
	a === undefined && b === undefined ? undefined : [a ?? 0, b ?? 0];

const validate = (meta: FieldMeta, value: any): string | undefined => {
	switch (meta.kind) {
		case 'string':
			if (meta.required && (!value || String(value).trim() === '')) return 'Обязательное поле';
			return;
		case 'number':
			if (meta.required && (value === undefined || value === null || value === '')) return 'Обязательное поле';
			if (value !== undefined && value !== '' && Number.isNaN(Number(value))) return 'Должно быть числом';
			if (typeof meta.min === 'number' && Number(value) < meta.min) return `Минимум ${meta.min}`;
			if (typeof meta.max === 'number' && Number(value) > meta.max) return `Максимум ${meta.max}`;
			return;
		case 'range': {
			const [a, b] = (value ?? []) as [number?, number?];
			if (meta.required && (a === undefined || b === undefined)) return 'Укажи оба значения';
			if (a !== undefined && typeof meta.min === 'number' && a < meta.min) return `Минимум ${meta.min}`;
			if (b !== undefined && typeof meta.max === 'number' && b > meta.max) return `Максимум ${meta.max}`;
			return;
		}
		default:
			return;
	}
};

/** ---------- СХЕМА ПАРАМЕТРОВ (строго проверяется против FunctionParams) ---------- */
const PARAM_SCHEMA = {
	Common: {
		GenerateWallets: {
			amount: { kind: 'number', label: 'Количество', required: true, min: 1, step: 1 },
		},
		RefuelGasZip: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			minBalanceToKeep: { kind: 'range', labelMin: 'Держать от', labelMax: 'до', min: 0 },
			minAmountToSend: { kind: 'number', label: 'Мин. сумма отправки', min: 0 },
			toChainIds: { kind: 'chainId[]', label: 'Цепи назначения' },
		},
		RefuelManyGasZip: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			toChainIds: { kind: 'chainId[]', label: 'Цепи назначения' },
			addresses: { kind: 'string[]', label: 'Адреса (CSV/пробелы)' },
		},
		RefuelRelayLink: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			minBalanceToKeep: { kind: 'range', labelMin: 'Держать от', labelMax: 'до', min: 0 },
			minAmountToSend: { kind: 'number', label: 'Мин. сумма отправки', min: 0 },
			toChainId: { kind: 'chainId', label: 'Цепь назначения' },
		},
		RefuelManyRelayLink: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			toChainId: { kind: 'chainId', label: 'Цепь назначения' },
			addresses: { kind: 'string[]', label: 'Адреса (CSV/пробелы)' },
		},
		CheckBalances: {
			networks: {
				kind: 'array',
				label: 'Сети',
				of: {
					kind: 'object',
					fields: {
						chainId: { kind: 'chainId', label: 'Chain' },
						tokenNames: { kind: 'string[]', label: 'Токены (через запятую)' },
						tokenAlert: {
							kind: 'object',
							fields: {
								symbol: { kind: 'string', label: 'Алёрт: символ' },
								less: { kind: 'boolean', label: 'Если меньше' },
								amountAlert: { kind: 'number', label: 'Порог', min: 0 },
							},
						},
					},
				},
				addLabel: 'Добавить сеть',
			},
		},
	},
	Evm: {
		SendToken: {
			token: { kind: 'string', label: 'Токен', required: true },
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			minBalanceToKeep: { kind: 'range', labelMin: 'Держать от', labelMax: 'до', min: 0 },
			minAmountToSend: { kind: 'number', label: 'Мин. сумма отправки', min: 0 },
			to: { kind: 'string', label: 'Куда (alias/адрес)', required: true },
		},
		CheckNft: { nftContract: { kind: 'string', label: 'NFT контракт', required: true } },
		Wrap: { amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 } },
		Unwrap: { amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 } },
		Approve: {
			tokenSymbol: { kind: 'string', label: 'Токен', required: true },
			spender: { kind: 'string', label: 'Spender', required: true },
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
		},
		MakeTransaction: {
			contractAddress: { kind: 'string', label: 'Контракт', required: true },
			data: { kind: 'string', label: 'Data (hex)' },
			value: { kind: 'number', label: 'Value (wei/eth)', min: 0 },
		},
	},
	Svm: {
		SendToken: {
			token: { kind: 'string', label: 'Токен', required: true },
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			minBalanceToKeep: { kind: 'range', labelMin: 'Держать от', labelMax: 'до', min: 0 },
			minAmountToSend: { kind: 'number', label: 'Мин. сумма отправки', min: 0 },
			to: { kind: 'string', label: 'Куда (alias/адрес)', required: true },
		},
	},
	Odos: {
		Swap: {
			token1: { kind: 'string', label: 'Токен 1', required: true },
			token2: { kind: 'string', label: 'Токен 2', required: true },
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			slippageInPercent: { kind: 'number', label: 'Слиппедж %', min: 0 },
			minAmountForSwap: { kind: 'number', label: 'Мин. сумма', min: 0 },
		},
	},
	Exchanges: {
		Withdraw: {
			exchanges: { kind: 'string[]', label: 'Биржи (CSV)' },
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			token: { kind: 'string', label: 'Токен', required: true },
			to: { kind: 'string', label: 'Куда (alias/адрес)', required: true },
			toChainId: { kind: 'string', label: 'Chain (строка)' }, // по интерфейсу — string
		},
	},
	Okx: {
		Withdraw: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			token: { kind: 'string', label: 'Токен', required: true },
			to: { kind: 'string', label: 'Куда', required: true },
			toChainId: { kind: 'chainId', label: 'Chain' },
		},
	},
	Bitget: {
		Withdraw: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			token: { kind: 'string', label: 'Токен', required: true },
			to: { kind: 'string', label: 'Куда', required: true },
			toChainId: { kind: 'chainId', label: 'Chain' },
		},
	},
	Gate: {
		Withdraw: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			token: { kind: 'string', label: 'Токен', required: true },
			to: { kind: 'string', label: 'Куда', required: true },
			toChainId: { kind: 'chainId', label: 'Chain' },
		},
	},
	Binance: {
		Withdraw: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			token: { kind: 'string', label: 'Токен', required: true },
			to: { kind: 'string', label: 'Куда', required: true },
			toChainId: { kind: 'chainId', label: 'Chain' },
		},
	},
	Bybit: {
		Withdraw: {
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
			token: { kind: 'string', label: 'Токен', required: true },
			to: { kind: 'string', label: 'Куда', required: true },
			toChainId: { kind: 'chainId', label: 'Chain' },
		},
	},
	CommonUi: {
		OpenPages: {
			browser: { kind: 'string', label: 'Браузер', required: true },
			pageUrls: { kind: 'string[]', label: 'URL (CSV/пробелы)' },
			loginInRabby: { kind: 'boolean', label: 'Login Rabby' },
			loginInPetra: { kind: 'boolean', label: 'Login Petra' },
		},
		RestoreMetamask: {
			browser: { kind: 'string', label: 'Браузер' },
			closeBrowser: { kind: 'boolean', label: 'Закрыть после' },
		},
		LoginInMetamask: { browser: { kind: 'string', label: 'Браузер' } },
		RestorePetra: {
			browser: { kind: 'string', label: 'Браузер' },
			closeBrowser: { kind: 'boolean', label: 'Закрыть после' },
		},
		RestoreBackpack: {
			browser: { kind: 'string', label: 'Браузер' },
			closeBrowser: { kind: 'boolean', label: 'Закрыть после' },
		},
		RestoreArgent: {
			browser: { kind: 'string', label: 'Браузер' },
			closeBrowser: { kind: 'boolean', label: 'Закрыть после' },
		},
		RestoreRabby: {
			browser: { kind: 'string', label: 'Браузер' },
			closeBrowser: { kind: 'boolean', label: 'Закрыть после' },
		},
		LoginInRabby: { browser: { kind: 'string', label: 'Браузер' } },
	},
	AdsPower: { GetProfiles: { count: { kind: 'number', label: 'Сколько', min: 1 } } },
	Vision: {
		GetProfiles: {
			token: { kind: 'string', label: 'Token', required: true },
			folderId: { kind: 'string', label: 'Folder ID', required: true },
		},
	},
	Opensea: {
		OpenseaBuyByLink: {
			browser: { kind: 'string', label: 'Браузер', required: true },
			links: { kind: 'string[]', label: 'Ссылки' },
		},
		SweepByLink: {
			browser: { kind: 'string', label: 'Браузер', required: true },
			links: { kind: 'string[]', label: 'Ссылки' },
			count: { kind: 'number', label: 'Кол-во', min: 1 },
		},
		SellCollectionByLink: {
			browser: { kind: 'string', label: 'Браузер', required: true },
			link: { kind: 'string', label: 'Ссылка', required: true },
		},
		ClaimUi: { browser: { kind: 'string', label: 'Браузер', required: true } },
	},
	Berachain: {
		FlyTradeSwap: {
			tokenSymbol1: { kind: 'string', label: 'Токен 1', required: true },
			tokenSymbol2: { kind: 'string', label: 'Токен 2', required: true },
			amount: { kind: 'range', labelMin: 'Сумма от', labelMax: 'до', required: true, min: 0 },
		},
	},
	Plasma: {
		Deposit: {
			token: { kind: 'string', label: 'Токен', required: true },
			amount: { kind: 'string', label: 'Сумма', required: true },
		},
	},
	ZksyncLite: { SendToken: { to: { kind: 'string', label: 'Получатель', required: true } } },
	TEST: { TEST: { kind: 'object', fields: {} } }, // плейсхолдер
} satisfies ParamSchemaRoot;

/** ---------- РЕНДЕР ---------- */
export default function FunctionParamsForm({
	group,
	action,
	values,
	onChange,
	networks,
}: {
	group: ActionsGroupName;
	action: ActionName;
	values: Record<string, any>;
	onChange: (patch: Record<string, any>) => void;
	networks?: NetworkConfig[];
}) {
	const schema: ActionSchema | undefined = group && action ? PARAM_SCHEMA[group]?.[action] : undefined;

	const setField = (name: string, val: any) => onChange({ [name]: val });

	return (
		<Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
			<Typography variant="h6" gutterBottom>
				Параметры функции (functionParams)
			</Typography>

			{!group || !action ? (
				<Alert severity="info">Выбери группу и действие слева.</Alert>
			) : !schema ? (
				<Alert severity="warning">
					Для «{group}.{action}» схема пока не описана.
				</Alert>
			) : Object.keys(schema).length === 0 ? (
				<Alert severity="success">
					Для «{group}.{action}» параметры не требуются.
				</Alert>
			) : (
				<Grid container spacing={2} sx={{ mt: 0 }}>
					{Object.entries(schema).map(([name, meta]) => (
						<FieldControl
							key={name}
							name={name}
							meta={meta}
							value={values[name]}
							setValue={(v) => setField(name, v)}
							networks={networks}
						/>
					))}
				</Grid>
			)}
		</Paper>
	);
}

/** ---------- КОНТРОЛЫ ---------- */
function FieldControl({
	name,
	meta,
	value,
	setValue,
	networks,
}: {
	name: string;
	meta: FieldMeta;
	value: any;
	setValue: (v: any) => void;
	networks?: NetworkConfig[];
}) {
	if (meta.kind === 'boolean') {
		return (
			<Grid item xs={12} md={6}>
				<FormControlLabel
					control={<Checkbox checked={!!value} onChange={(e) => setValue(e.target.checked)} />}
					label={meta.label}
				/>
			</Grid>
		);
	}

	if (meta.kind === 'string') {
		const err = validate(meta, value);
		return (
			<Grid item xs={12} md={6}>
				<TextField
					label={meta.label}
					placeholder={meta.placeholder}
					size="small"
					fullWidth
					value={value ?? ''}
					onChange={(e) => setValue(e.target.value || undefined)}
					error={!!err}
					helperText={err}
					required={!!meta.required}
				/>
			</Grid>
		);
	}

	if (meta.kind === 'number') {
		const err = validate(meta, value);
		return (
			<Grid item xs={12} md={6}>
				<TextField
					label={meta.label}
					type="number"
					size="small"
					fullWidth
					value={value ?? ''}
					onChange={(e) => setValue(e.target.value === '' ? undefined : e.target.valueAsNumber)}
					inputProps={{ min: meta.min, max: meta.max, step: meta.step ?? 'any' }}
					error={!!err}
					helperText={err}
					required={!!meta.required}
				/>
			</Grid>
		);
	}

	if (meta.kind === 'range') {
		const [a, b] = (value ?? []) as [number?, number?];
		const err = validate(meta, value);
		return (
			<Grid item xs={12}>
				<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
					<TextField
						label={meta.labelMin}
						type="number"
						size="small"
						fullWidth
						value={a ?? ''}
						onChange={(e) => setValue(rangeOrUndef(e.target.value === '' ? undefined : e.target.valueAsNumber, b))}
						inputProps={{ min: meta.min, step: meta.step ?? 'any' }}
						required={!!meta.required}
					/>
					<TextField
						label={meta.labelMax}
						type="number"
						size="small"
						fullWidth
						value={b ?? ''}
						onChange={(e) => setValue(rangeOrUndef(a, e.target.value === '' ? undefined : e.target.valueAsNumber))}
						inputProps={{ min: meta.min, step: meta.step ?? 'any' }}
					/>
				</Stack>
				{err && <FormHelperText error>{err}</FormHelperText>}
			</Grid>
		);
	}

	if (meta.kind === 'string[]' || meta.kind === 'number[]') {
		const text = Array.isArray(value) ? (value as any[]).join(', ') : '';
		return (
			<Grid item xs={12}>
				<TextField
					label={meta.label}
					placeholder={meta.kind === 'string[]' ? (meta.placeholder ?? 'a, b, c') : '1, 2, 3'}
					size="small"
					fullWidth
					value={text}
					onChange={(e) => {
						const parts = parseCsv(e.target.value);
						setValue(meta.kind === 'number[]' ? toNumberArray(parts) : parts);
					}}
				/>
			</Grid>
		);
	}

	if (meta.kind === 'chainId') {
		if (networks?.length) {
			return (
				<Grid item xs={12} md={6}>
					<FormControl fullWidth size="small">
						<InputLabel>{meta.label}</InputLabel>
						<Select label={meta.label} value={value ?? ''} onChange={(e) => setValue(e.target.value)}>
							{networks.map((n) => (
								<MenuItem key={n.chainId} value={n.chainId}>
									{n.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
			);
		}
		return (
			<Grid item xs={12} md={6}>
				<TextField
					label={meta.label}
					type="number"
					size="small"
					fullWidth
					value={value ?? ''}
					onChange={(e) => setValue(e.target.valueAsNumber)}
				/>
			</Grid>
		);
	}

	if (meta.kind === 'chainId[]') {
		if (networks?.length) {
			const arr: (number | string)[] = Array.isArray(value) ? value : [];
			return (
				<Grid item xs={12}>
					<FormControl fullWidth size="small">
						<InputLabel>{meta.label}</InputLabel>
						<Select
							label={meta.label}
							multiple
							value={arr as any}
							onChange={(e) => setValue(e.target.value)}
							renderValue={(vals) =>
								(vals as any[]).map((v) => networks.find((n) => n.chainId === v)?.name ?? v).join(', ')
							}
						>
							{networks.map((n) => (
								<MenuItem key={n.chainId} value={n.chainId}>
									{n.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
			);
		}
		return (
			<Grid item xs={12}>
				<TextField
					label={meta.label}
					placeholder="1, 137, 8453"
					size="small"
					fullWidth
					value={Array.isArray(value) ? (value as any[]).join(', ') : ''}
					onChange={(e) => setValue(toNumberArray(parseCsv(e.target.value)))}
				/>
			</Grid>
		);
	}

	if (meta.kind === 'object') {
		const v = (value ?? {}) as Record<string, any>;
		return (
			<Grid item xs={12}>
				{meta.label && (
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						{meta.label}
					</Typography>
				)}
				<Grid container spacing={2}>
					{Object.entries(meta.fields).map(([sub, subMeta]) => (
						<FieldControl
							key={sub}
							name={`${name}.${sub}`}
							meta={subMeta}
							value={v[sub]}
							setValue={(nv) => setValue({ ...v, [sub]: nv })}
							networks={networks}
						/>
					))}
				</Grid>
			</Grid>
		);
	}

	if (meta.kind === 'array') {
		const arr = Array.isArray(value) ? (value as any[]) : [];
		const add = () => {
			if (meta.of.kind === 'object') {
				const empty: Record<string, any> = {};
				for (const k of Object.keys(meta.of.fields)) empty[k] = undefined;
				setValue([...(arr ?? []), empty]);
			} else {
				setValue([...(arr ?? []), undefined]);
			}
		};
		const remove = (i: number) => {
			const copy = [...arr];
			copy.splice(i, 1);
			setValue(copy.length ? copy : undefined);
		};
		return (
			<Grid item xs={12}>
				<Stack spacing={1}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Typography variant="subtitle2">{meta.label}</Typography>
						<Button size="small" startIcon={<AddIcon />} onClick={add}>
							{meta.addLabel ?? 'Добавить'}
						</Button>
					</Stack>
					{arr.length === 0 && <Alert severity="info">Список пуст</Alert>}
					{arr.map((item, idx) => (
						<Box key={idx} sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.12)' }}>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
								<Typography variant="body2">Элемент #{idx + 1}</Typography>
								<IconButton size="small" onClick={() => remove(idx)}>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Stack>
							{meta.of.kind === 'object' ? (
								<Grid container spacing={2}>
									{Object.entries(meta.of.fields).map(([sub, subMeta]) => (
										<FieldControl
											key={sub}
											name={`${name}[${idx}].${sub}`}
											meta={subMeta}
											value={item?.[sub]}
											setValue={(nv) => {
												const next = [...arr];
												next[idx] = { ...(next[idx] ?? {}), [sub]: nv };
												setValue(next);
											}}
											networks={networks}
										/>
									))}
								</Grid>
							) : (
								<FieldControl
									name={`${name}[${idx}]`}
									meta={meta.of}
									value={item}
									setValue={(nv) => {
										const next = [...arr];
										next[idx] = nv;
										setValue(next);
									}}
									networks={networks}
								/>
							)}
						</Box>
					))}
				</Stack>
			</Grid>
		);
	}

	return null;
}
