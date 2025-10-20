import React, { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Grid,
	Paper,
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SecretStorage } from '../../../../src/utils/secretStorage.type';

import type { Cex } from '../../../../src/utils/account/models/cex.type';
import { encryptSecretStorage, getSecrets, postSecrets } from '../../api/client';
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

	const commit = React.useCallback(
		(v: string) => {
			onChange(v);
		},
		[onChange],
	);

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

export default function SecretsPage() {
	const [encrypted, setEncrypted] = useState<SecretStorage>();
	const [decrypted, setDecrypted] = useState<SecretStorage>();

	const [variant, setVariant] = useState<Variant>('decrypted');
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState<Toast>({ open: false, severity: 'success', message: '' });

	const [openConvertDialog, setOpenConvertDialog] = useState(false);
	const [conversionMode, setConversionMode] = useState<'encrypt' | 'decrypt' | null>(null);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const current = useMemo(() => (variant === 'encrypted' ? encrypted : decrypted), [variant, encrypted, decrypted]);
	const setCurrent = variant === 'encrypted' ? setEncrypted : setDecrypted;

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const data = await getSecrets();
				setEncrypted(data.encrypted);
				setDecrypted(data.decrypted);
			} catch (e: any) {
				setToast({ open: true, severity: 'error', message: `Ошибка загрузки: ${e.message}` });
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const handleSave = async () => {
		if (saving) return;
		setSaving(true);
		try {
			await postSecrets({ encrypted, decrypted });
			setToast({ open: true, severity: 'success', message: 'Данные сохранены 👍' });
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка сохранения: ${e.message}` });
		} finally {
			setSaving(false);
		}
	};

	const handleCloseToast = (_event: React.SyntheticEvent | Event, reason?: 'timeout' | 'clickaway' | 'escapeKeyDown') => {
		if (reason === 'clickaway') return;
		setToast((p) => ({ ...p, open: false }));
	};

	const update = <K extends keyof SecretStorage>(key: K, val: SecretStorage[K]) => {
		setCurrent((prev) => ({ ...prev, [key]: val }));
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

	const handleOpenConvertDialog = (mode: 'encrypt' | 'decrypt') => {
		setConversionMode(mode);
		setPassword('');
		setConfirmPassword('');
		setOpenConvertDialog(true);
	};

	const handleCloseConvertDialog = () => {
		setOpenConvertDialog(false);
		setConversionMode(null);
	};

	const handleConfirmConvert = async () => {
		if (!password || password !== confirmPassword) {
			return;
		}
		try {
			await encryptSecretStorage(password, conversionMode === 'encrypt');
			setOpenConvertDialog(false);
			setToast({
				open: true,
				severity: 'success',
				message: `Данные ${conversionMode === 'encrypt' ? 'зашифрованы' : 'расшифрованы'}`,
			});
			const data = await getSecrets();
			setEncrypted(data.encrypted);
			setDecrypted(data.decrypted);
		} catch (error: any) {
			setToast({
				open: true,
				severity: 'error',
				message: `Не удалось ${conversionMode === 'encrypt' ? 'зашифровать' : 'расшифровать'} данные: ${error}`,
			});
		}
	};

	const telegram = (current?.telegram ?? {}) as NonNullable<SecretStorage['telegram']>;

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				Секретные данные
			</Typography>

			<Tabs value={variant} onChange={(_, v) => setVariant(v)} textColor="inherit" indicatorColor="primary" sx={{ mb: 2 }}>
				<Tab value="encrypted" label="Зашифрованный файл" />
				<Tab value="decrypted" label="Расшифрованный файл" />
			</Tabs>

			{current ? (
				<>
					<Accordion defaultExpanded TransitionProps={{ unmountOnExit: true }}>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography>Основной EVM-кошелёк</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<WalletForm
								value={current.mainEvmWallet as Wallet | undefined}
								onChange={(next) => update('mainEvmWallet', next)}
							/>
						</AccordionDetails>
					</Accordion>

					<Accordion TransitionProps={{ unmountOnExit: true }}>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography>Биржи</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Grid container spacing={3}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										label="Binance"
										value={current.mainBinanceAccount as Cex | undefined}
										onChange={(next) => update('mainBinanceAccount', next)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										label="OKX"
										value={current.mainOkxAccount as Cex | undefined}
										onChange={(next) => update('mainOkxAccount', next)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										label="Bitget"
										value={current.mainBitgetAccount as Cex | undefined}
										onChange={(next) => update('mainBitgetAccount', next)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										label="Gate"
										value={current.mainGateAccount as Cex | undefined}
										onChange={(next) => update('mainGateAccount', next)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<CexForm
										label="Bybit"
										value={current.mainBybitAccount as Cex | undefined}
										onChange={(next) => update('mainBybitAccount', next)}
									/>
								</Grid>
							</Grid>
						</AccordionDetails>
					</Accordion>

					<Accordion TransitionProps={{ unmountOnExit: true }}>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography>API-ключи и прочее</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Grid container spacing={2}>
								{stringFields.map(({ key, label, type }) => {
									const val = (current[key] as string | undefined) ?? '';
									return (
										<Grid key={String(key)} sx={{ width: '400px' }}>
											<DebouncedTextField
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

					<Accordion TransitionProps={{ unmountOnExit: true }}>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography>Telegram</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Grid container spacing={2}>
								<Grid sx={{ width: '400px' }}>
									<DebouncedTextField
										label="Bot API Key"
										fullWidth
										value={telegram?.apiKey ?? ''}
										onChange={(v) => update('telegram', { ...(current?.telegram ?? {}), apiKey: v })}
									/>
								</Grid>
								<Grid sx={{ width: '400px' }}>
									<DebouncedTextField
										label="Chat ID"
										fullWidth
										value={telegram?.chatId ?? ''}
										onChange={(v) => update('telegram', { ...(current?.telegram ?? {}), chatId: v })}
									/>
								</Grid>
							</Grid>
						</AccordionDetails>
					</Accordion>

					<Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
						<Button variant="contained" onClick={handleSave} disabled={loading || saving} sx={{ height: 45, px: 3 }}>
							Сохранить
						</Button>
						<Button
							sx={{ marginLeft: '20px' }}
							variant="contained"
							onClick={() => handleOpenConvertDialog(variant === 'encrypted' ? 'decrypt' : 'encrypt')}
						>
							{variant === 'encrypted' ? 'Расшифровать данные' : 'Зашифровать данные'}
						</Button>
						<Dialog open={openConvertDialog} onClose={handleCloseConvertDialog}>
							<DialogTitle>
								{conversionMode === 'encrypt' ? 'Зашифровать данные' : 'Расшифровать данные'}
							</DialogTitle>
							<DialogContent>
								<DialogContentText sx={{ mb: 2 }}>
									Все {conversionMode === 'encrypt' ? 'зашифрованные' : 'расшифрованные'} данные будут
									перезаписаны. Введите пароль:
								</DialogContentText>

								<TextField
									label="Пароль"
									type="password"
									fullWidth
									margin="normal"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
								<TextField
									label="Повторите пароль"
									type="password"
									fullWidth
									margin="normal"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									error={confirmPassword.length > 0 && password !== confirmPassword}
									helperText={
										confirmPassword.length > 0 && password !== confirmPassword ? 'Пароли не совпадают' : ''
									}
								/>
							</DialogContent>
							<DialogActions>
								<Button onClick={handleCloseConvertDialog}>Отмена</Button>
								<Button
									onClick={handleConfirmConvert}
									variant="contained"
									color="primary"
									disabled={!password || password !== confirmPassword}
								>
									{conversionMode === 'encrypt' ? 'Зашифровать' : 'Расшифровать'}
								</Button>
							</DialogActions>
						</Dialog>
					</Box>
				</>
			) : (
				!loading && (
					<Alert severity="warning">
						{variant === 'decrypted'
							? 'Нет расшифрованного файла. Если хочешь увидеть расшифрованные данные, расшифруй зашифрованный файл.'
							: 'Нет зашифрованного файла. Если хочешь зашифровать данные, зашифруй расшифрованный файл.'}
					</Alert>
				)
			)}

			<Snackbar
				open={toast.open}
				autoHideDuration={5000}
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
