import React, { useMemo, useState } from 'react';
import {
	Alert,
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Grid,
	Snackbar,
	Tab,
	Tabs,
	TextField,
	Typography,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SecretStorage } from '../../../../src/utils/secretStorage.type';

import type { Cex } from '../../../../src/utils/account/models/cex.type';
import { CexForm } from './CexForm';
import { WalletForm } from './WalletForm';
import type { Wallet } from '../../../../src/utils/account/models/wallet.type';

type Variant = 'encrypted' | 'decrypted';
interface Toast {
	open: boolean;
	severity: 'success' | 'error' | 'info' | 'warning';
	message: string;
}

type TextFieldProps = React.ComponentProps<typeof TextField>;
interface DebouncedTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
	value: string;
	onChange: (val: string) => void;
}
const DebouncedTextField = React.memo(function DebouncedTextField({ value, onChange, ...rest }: DebouncedTextFieldProps) {
	const [local, setLocal] = React.useState(value ?? '');
	const timeoutRef = React.useRef<number | null>(null);

	React.useEffect(() => {
		setLocal(value ?? '');
	}, [value]);

	const commit = React.useCallback((v: string) => onChange(v), [onChange]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value;
		setLocal(v);
		if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
		timeoutRef.current = window.setTimeout(() => commit(v), 250);
	};

	const handleBlur = () => commit(local);

	return (
		<TextField
			{...rest}
			value={local}
			onChange={handleChange}
			onBlur={handleBlur}
			slotProps={{ input: { spellCheck: false, autoComplete: 'off' } }}
		/>
	);
});

/** Рекурсивная очистка: строки -> '', массивы -> [], объекты -> рекурсивно */
function deepClear<T>(obj: T): T {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return [] as unknown as T;
	if (typeof obj === 'string') return '' as unknown as T;
	if (typeof obj === 'object') {
		const next: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			if (v === null || v === undefined) {
				next[k] = v;
			} else if (typeof v === 'string') {
				next[k] = '';
			} else if (Array.isArray(v)) {
				next[k] = [];
			} else if (typeof v === 'object') {
				next[k] = deepClear(v);
			} else {
				next[k] = v;
			}
		}
		return next as T;
	}
	return obj;
}

interface Props {
	encrypted?: SecretStorage;
	decrypted?: SecretStorage;
	setEncrypted?: React.Dispatch<React.SetStateAction<SecretStorage | undefined>>;
	setDecrypted?: React.Dispatch<React.SetStateAction<SecretStorage | undefined>>;
	loading?: boolean;
	saving?: boolean;
	onSave?: () => Promise<void> | void;
}

export default function StoragePage({ encrypted, decrypted, setEncrypted, setDecrypted, loading, saving, onSave }: Props) {
	const [variant, setVariant] = useState<Variant>('decrypted');
	const [toast, setToast] = useState<Toast>({ open: false, severity: 'success', message: '' });
	const [openResetDialog, setOpenResetDialog] = useState(false);

	const current = useMemo(() => (variant === 'encrypted' ? encrypted : decrypted), [variant, encrypted, decrypted]);
	const setCurrent = variant === 'encrypted' ? setEncrypted : setDecrypted;

	const handleSave = async () => {
		if (!onSave) return;
		await onSave();
	};

	const handleCloseToast = (_event?: unknown, reason?: string) => {
		if (reason === 'clickaway') return;
		setToast((p) => ({ ...p, open: false }));
	};

	const update = <K extends keyof SecretStorage>(key: K, val: SecretStorage[K]) => {
		setCurrent?.((prev) => ({ ...(prev ?? ({} as SecretStorage)), [key]: val }));
	};

	const stringFields: { key: keyof SecretStorage; label: string; type?: 'password' | 'text' }[] = [
		{ key: 'cmcApiKey', label: 'CMC API Key', type: 'text' },
		{ key: 'rucaptchaApiKey', label: 'RuCaptcha API Key', type: 'text' },
		{ key: 'capSolverApiKey', label: 'CapSolver API Key', type: 'text' },
		{ key: '_2captchaApiKey', label: '2Captcha API Key', type: 'text' },
		{ key: 'etherscanApiKey', label: 'Etherscan API Key', type: 'text' },
		{ key: 'polygonscanApiKey', label: 'Polygonscan API Key', type: 'text' },
		{ key: 'lineascanApiKey', label: 'Lineascan API Key', type: 'text' },
		{ key: 'arbiscanApiKey', label: 'Arbiscan API Key', type: 'text' },
		{ key: 'basescanApiKey', label: 'Basescan API Key', type: 'text' },
		{ key: 'scrollscanApiKey', label: 'Scrollscan API Key', type: 'text' },
		{ key: 'berascanApiKey', label: 'Berascan API Key', type: 'text' },
		{ key: 'deepseekApiKey', label: 'Deepseek API Key', type: 'text' },
		{ key: 'wssRpcUrl', label: 'WSS RPC URL', type: 'text' },
	];

	const telegram = (current?.telegram ?? {}) as NonNullable<SecretStorage['telegram']>;

	const handleResetAll = () => {
		if (!setCurrent) return;
		setCurrent((prev) => (prev ? deepClear(prev) : prev));
		setOpenResetDialog(false);
		setToast({ open: true, severity: 'success', message: 'Все поля очищены' });
	};

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Tabs value={variant} onChange={(_, v) => setVariant(v)} textColor="inherit" indicatorColor="primary" sx={{ mb: 2 }}>
				<Tab value="decrypted" label="Расшифрованные" />
				<Tab value="encrypted" label="Зашифрованные" />
			</Tabs>

			{current ? (
				<>
					{variant === 'decrypted' && (
						<Box sx={{ display: 'flex', mb: 2 }}>
							<Button
								variant="outlined"
								color="secondary"
								onClick={() => setOpenResetDialog(true)}
								disabled={!!loading}
							>
								Очистить все поля
							</Button>
							<Button variant="contained" onClick={handleSave} disabled={!!loading || !!saving} sx={{ ml: 2 }}>
								Сохранить изменения
							</Button>
						</Box>
					)}

					<Accordion slotProps={{ transition: { unmountOnExit: true } }}>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography>Основной EVM-кошелёк</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<WalletForm
								disabled={variant === 'encrypted'}
								value={current.mainEvmWallet as Wallet | undefined}
								onChange={(next) => update('mainEvmWallet', next)}
							/>
						</AccordionDetails>
					</Accordion>

					<Accordion slotProps={{ transition: { unmountOnExit: true } }}>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography>Биржи</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Grid container spacing={3}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										disabled={variant === 'encrypted'}
										label="Binance"
										value={current.mainBinanceAccount as Cex | undefined}
										onChange={(next) => update('mainBinanceAccount', next)}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										disabled={variant === 'encrypted'}
										label="OKX"
										value={current.mainOkxAccount as Cex | undefined}
										onChange={(next) => update('mainOkxAccount', next)}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										disabled={variant === 'encrypted'}
										label="Bitget"
										value={current.mainBitgetAccount as Cex | undefined}
										onChange={(next) => update('mainBitgetAccount', next)}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										disabled={variant === 'encrypted'}
										label="Gate"
										value={current.mainGateAccount as Cex | undefined}
										onChange={(next) => update('mainGateAccount', next)}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										disabled={variant === 'encrypted'}
										label="Bybit"
										value={current.mainBybitAccount as Cex | undefined}
										onChange={(next) => update('mainBybitAccount', next)}
									/>
								</Grid>
							</Grid>
						</AccordionDetails>
					</Accordion>

					<Accordion slotProps={{ transition: { unmountOnExit: true } }}>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography>API-ключи и прочее</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Grid container spacing={2}>
								{stringFields.map(({ key, label, type }) => {
									const val = (current[key] as string | undefined) ?? '';
									return (
										<Grid key={String(key)} sx={{ width: 400 }}>
											<DebouncedTextField
												disabled={variant === 'encrypted'}
												label={label}
												type={type === 'password' ? 'password' : 'text'}
												fullWidth
												value={val}
												onChange={(nextVal) => update(key, nextVal as any)}
											/>
										</Grid>
									);
								})}
							</Grid>
						</AccordionDetails>
					</Accordion>

					<Accordion slotProps={{ transition: { unmountOnExit: true } }}>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography>Telegram</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Grid container spacing={2}>
								<Grid sx={{ width: 400 }}>
									<DebouncedTextField
										disabled={variant === 'encrypted'}
										label="Bot API Key"
										fullWidth
										value={telegram?.apiKey ?? ''}
										onChange={(v) => update('telegram', { ...(current?.telegram ?? {}), apiKey: v } as any)}
									/>
								</Grid>
								<Grid sx={{ width: 400 }}>
									<DebouncedTextField
										disabled={variant === 'encrypted'}
										label="Chat ID"
										fullWidth
										value={telegram?.chatId ?? ''}
										onChange={(v) => update('telegram', { ...(current?.telegram ?? {}), chatId: v } as any)}
									/>
								</Grid>
							</Grid>
						</AccordionDetails>
					</Accordion>
				</>
			) : (
				!loading && (
					<Alert severity="warning">
						{variant === 'decrypted' ? 'Нет расшифрованных данных.' : 'Нет зашифрованных данных.'}
					</Alert>
				)
			)}

			<Dialog open={openResetDialog} onClose={() => setOpenResetDialog(false)}>
				<DialogTitle>Очистить все поля?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Данные не сохранятся автоматически. После очистки нажми «Сохранить изменения».
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenResetDialog(false)}>Отмена</Button>
					<Button variant="contained" color="secondary" onClick={handleResetAll}>
						Сбросить
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={toast.open}
				autoHideDuration={4000}
				onClose={handleCloseToast}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
					{toast.message}
				</Alert>
			</Snackbar>
		</Paper>
	);
}
