import React, { useEffect, useMemo, useState } from 'react';
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
	CircularProgress,
	Backdrop,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SecretStorage } from '../../../../src/utils/secretStorage.type';
import type { Cex } from '../../../../src/utils/account/models/cex.type';
import { CexForm } from './CexForm';
import { WalletForm } from './WalletForm';
import type { Wallet } from '../../../../src/utils/account/models/wallet.type';

// 👇 ожидаемые функции клиента (см. блок "API-клиент" ниже)
import { getStorage, postSecrets, encryptStorage, decryptStorage } from '../../api';

type Variant = 'encrypted' | 'decrypted';
interface Toast {
	open: boolean;
	severity: 'success' | 'error' | 'info' | 'warning';
	message: string;
}

const DebouncedTextField = React.memo(function DebouncedTextField({
	value,
	onChange,
	...rest
}: { value: string; onChange: (v: string) => void } & React.ComponentProps<typeof TextField>) {
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

function deepClear<T>(obj: T): T {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return [] as unknown as T;
	if (typeof obj === 'string') return '' as unknown as T;
	if (typeof obj === 'object') {
		const next: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			if (v === null || v === undefined) next[k] = v;
			else if (typeof v === 'string') next[k] = '';
			else if (Array.isArray(v)) next[k] = [];
			else if (typeof v === 'object') next[k] = deepClear(v);
			else next[k] = v;
		}
		return next as T;
	}
	return obj;
}

export default function StoragePage() {
	const [variant, setVariant] = useState<Variant>('decrypted');
	const [toast, setToast] = useState<Toast>({ open: false, severity: 'success', message: '' });

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [encrypted, setEncrypted] = useState<SecretStorage | undefined>(undefined);
	const [decrypted, setDecrypted] = useState<SecretStorage | undefined>(undefined);

	const [openCryptDialog, setOpenCryptDialog] = useState(false);
	const [isEncryption, setIsEncryption] = useState(true);
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [cryptLoading, setCryptLoading] = useState(false);

	const current = useMemo(() => (variant === 'encrypted' ? encrypted : decrypted), [variant, encrypted, decrypted]);
	const setCurrent = variant === 'encrypted' ? setEncrypted : setDecrypted;

	const fetchStorage = async () => {
		setLoading(true);
		try {
			const storage = await getStorage();
			setEncrypted(storage.encrypted);
			setDecrypted(storage.decrypted);
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка загрузки ключей: ${e?.message ?? e}` });
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		void fetchStorage();
	}, []);

	const handleSave = async () => {
		setSaving(true);
		try {
			await postSecrets({ encrypted, decrypted });
			setToast({ open: true, severity: 'success', message: 'Данные сохранены ✅' });
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка сохранения данных: ${e?.message ?? e}` });
		} finally {
			setSaving(false);
		}
	};

	const openEncrypt = (enc: boolean) => {
		setIsEncryption(enc);
		setPassword('');
		setConfirm('');
		setOpenCryptDialog(true);
	};
	const confirmCrypt = async () => {
		if (!password || (isEncryption && password !== confirm)) return;
		setCryptLoading(true);
		try {
			if (isEncryption) await encryptStorage(password);
			else await decryptStorage(password);
			setOpenCryptDialog(false);
			setToast({
				open: true,
				severity: 'success',
				message: `Ключи ${isEncryption ? 'зашифрованы' : 'расшифрованы'} ✅`,
			});
			await fetchStorage();
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Не удалось выполнить операцию: ${e?.message ?? e}` });
		} finally {
			setCryptLoading(false);
		}
	};

	const handleResetAll = () => {
		setCurrent((prev) => (prev ? deepClear(prev) : prev));
		setToast({ open: true, severity: 'success', message: 'Все поля очищены' });
	};

	const closeToast = (_e?: any, reason?: string) => {
		if (reason === 'clickaway') return;
		setToast((p) => ({ ...p, open: false }));
	};

	const stringFields: { key: keyof SecretStorage; label: string }[] = [
		{ key: 'cmcApiKey', label: 'CMC API Key' },
		{ key: 'rucaptchaApiKey', label: 'RuCaptcha API Key' },
		{ key: 'capSolverApiKey', label: 'CapSolver API Key' },
		{ key: '_2captchaApiKey', label: '2Captcha API Key' },
		{ key: 'etherscanApiKey', label: 'Etherscan API Key' },
		{ key: 'polygonscanApiKey', label: 'Polygonscan API Key' },
		{ key: 'lineascanApiKey', label: 'Lineascan API Key' },
		{ key: 'arbiscanApiKey', label: 'Arbiscan API Key' },
		{ key: 'basescanApiKey', label: 'Basescan API Key' },
		{ key: 'scrollscanApiKey', label: 'Scrollscan API Key' },
		{ key: 'berascanApiKey', label: 'Berascan API Key' },
		{ key: 'deepseekApiKey', label: 'Deepseek API Key' },
		{ key: 'wssRpcUrl', label: 'WSS RPC URL' },
	];

	const telegram = (current?.telegram ?? {}) as NonNullable<SecretStorage['telegram']>;
	const update = <K extends keyof SecretStorage>(key: K, val: SecretStorage[K]) => {
		setCurrent((prev) => ({ ...(prev ?? ({} as SecretStorage)), [key]: val }));
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
			<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
				<Tabs value={variant} onChange={(_, v) => setVariant(v)} textColor="inherit" indicatorColor="primary">
					<Tab value="decrypted" label="Расшифрованные" />
					<Tab value="encrypted" label="Зашифрованные" />
				</Tabs>
				<Button sx={{ ml: 'auto' }} variant="outlined" color="success" onClick={() => openEncrypt(true)}>
					Зашифровать ключи
				</Button>
				<Button variant="outlined" color="secondary" onClick={() => openEncrypt(false)}>
					Расшифровать ключи
				</Button>
			</Box>

			<Box sx={{ display: 'flex', mb: 2, gap: 2 }}>
				{variant === 'decrypted' && (
					<>
						<Button variant="contained" onClick={handleSave} disabled={!!loading || !!saving}>
							Сохранить изменения
						</Button>
						<Button variant="outlined" color="secondary" onClick={handleResetAll}>
							Очистить все поля
						</Button>
					</>
				)}
			</Box>

			{loading ? (
				<Backdrop open>
					<CircularProgress />
				</Backdrop>
			) : current ? (
				<>
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
							<Typography>Основной SVM-кошелёк</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<WalletForm
								disabled={variant === 'encrypted'}
								value={current.mainSvmWallet as Wallet | undefined}
								onChange={(next) => update('mainSvmWallet', next)}
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
								{stringFields.map(({ key, label }) => {
									const val = (current[key] as string | undefined) ?? '';
									return (
										<Grid key={String(key)} sx={{ width: 400 }}>
											<DebouncedTextField
												disabled={variant === 'encrypted'}
												label={label}
												fullWidth
												value={val}
												onChange={(nv) => update(key, nv as any)}
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
				<Alert severity="warning">
					{variant === 'decrypted' ? 'Нет расшифрованных ключей.' : 'Нет зашифрованных ключей.'}
				</Alert>
			)}

			<Dialog open={openCryptDialog} onClose={() => setOpenCryptDialog(false)}>
				<DialogTitle>{isEncryption ? 'Зашифровать ключи' : 'Расшифровать ключи'}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						<Typography color="text.primary">
							{isEncryption ? 'Зашифрованные' : 'Расшифрованные'} ключи будут перезаписаны.
							{isEncryption && (
								<>
									<br />
									<Typography component="span" color="error.main" fontWeight="bold">
										ПАРОЛИ ШИФРОВАНИЯ АККАУНТОВ И КЛЮЧЕЙ ДОЛЖНЫ СОВПАДАТЬ
									</Typography>
								</>
							)}
							<br />
							Введите пароль:
						</Typography>
					</DialogContentText>
					<TextField
						label="Пароль"
						type="password"
						fullWidth
						margin="normal"
						disabled={cryptLoading}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					{isEncryption && (
						<TextField
							label="Повторите пароль"
							type="password"
							fullWidth
							margin="normal"
							disabled={cryptLoading}
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
							error={!!confirm && password !== confirm}
							helperText={!!confirm && password !== confirm ? 'Пароли не совпадают' : ''}
						/>
					)}
				</DialogContent>
				<DialogActions>
					<Button disabled={cryptLoading} onClick={() => setOpenCryptDialog(false)}>
						Отмена
					</Button>
					<Button
						onClick={confirmCrypt}
						variant="contained"
						disabled={!password || (isEncryption && password !== confirm) || cryptLoading}
					>
						{isEncryption ? 'Зашифровать' : 'Расшифровать'}
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={toast.open}
				autoHideDuration={4000}
				onClose={closeToast}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
					{toast.message}
				</Alert>
			</Snackbar>
		</Paper>
	);
}
