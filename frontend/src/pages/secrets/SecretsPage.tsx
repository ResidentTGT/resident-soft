import { useEffect, useState } from 'react';
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Paper,
	Snackbar,
	Tab,
	Tabs,
	TextField,
} from '@mui/material';

import StoragePage from './StoragePage';
import { encryptSecrets, getAccounts, getStorage, postAccounts, postSecrets } from '../../api/client';
import type { SecretStorage } from '../../../../src/utils/secretStorage.type';
import AccountsPage, { type AccountsFile } from './AccountsPage';

type DataType = 'accounts' | 'storage';
interface Toast {
	open: boolean;
	severity: 'success' | 'error' | 'info' | 'warning';
	message: string;
}

export default function SecretsPage() {
	const [dataType, setDataType] = useState<DataType>('storage');

	const [loading, setLoading] = useState(true);
	const [loadingConvert, setLoadingConvert] = useState(false);

	const [isEncryption, setIsEncryption] = useState(true);
	const [openConvertDialog, setOpenConvertDialog] = useState(false);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const [storageEncrypted, setStorageEncrypted] = useState<SecretStorage | undefined>(undefined);
	const [storageDecrypted, setStorageDecrypted] = useState<SecretStorage | undefined>(undefined);
	const [savingStorage, setSavingStorage] = useState(false);

	const [accountsEncrypted, setAccountsEncrypted] = useState<AccountsFile[]>([]);
	const [accountsDecrypted, setAccountsDecrypted] = useState<AccountsFile[]>([]);
	const [savingAccounts, setSavingAccounts] = useState(false);

	const [toast, setToast] = useState<Toast>({ open: false, severity: 'success', message: '' });

	const handleCloseToast = (_event: React.SyntheticEvent | Event, reason?: 'timeout' | 'clickaway' | 'escapeKeyDown') => {
		if (reason === 'clickaway') return;
		setToast((p) => ({ ...p, open: false }));
	};

	const handleOpenConvertDialog = (isEncryption: boolean) => {
		setIsEncryption(isEncryption);
		setPassword('');
		setConfirmPassword('');
		setOpenConvertDialog(true);
	};

	const handleCloseConvertDialog = () => {
		setOpenConvertDialog(false);
	};

	const handleConfirmConvert = async () => {
		if (!password || (isEncryption && password !== confirmPassword)) {
			return;
		}
		setLoadingConvert(true);
		try {
			await encryptSecrets(password, isEncryption);
			setOpenConvertDialog(false);
			setToast({
				open: true,
				severity: 'success',
				message: `Данные ${isEncryption ? 'зашифрованы' : 'расшифрованы'}`,
			});
			await fetchAllData();
		} catch (error: any) {
			setToast({
				open: true,
				severity: 'error',
				message: `Не удалось ${isEncryption ? 'зашифровать' : 'расшифровать'} данные: ${error}`,
			});
		} finally {
			setLoadingConvert(false);
		}
	};

	const saveStorage = async () => {
		if (savingStorage) return;
		setSavingStorage(true);
		try {
			await postSecrets({ encrypted: storageEncrypted, decrypted: storageDecrypted });
			setToast({ open: true, severity: 'success', message: 'Данные сохранены 👍' });
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка сохранения данных: ${e?.message ?? e}` });
		} finally {
			setSavingStorage(false);
		}
	};

	const saveAccounts = async () => {
		if (savingAccounts) return;
		setSavingAccounts(true);
		try {
			await postAccounts({ encrypted: accountsEncrypted, decrypted: accountsDecrypted });
			setToast({ open: true, severity: 'success', message: 'Аккаунты сохранены ✅' });
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка сохранения аккаунтов: ${e?.message ?? e}` });
		} finally {
			setSavingAccounts(false);
		}
	};

	const fetchAllData = async () => {
		setLoading(true);

		try {
			const storage = await getStorage();
			const accounts = await getAccounts();

			console.log(accounts);

			setStorageEncrypted(storage.encrypted);
			setStorageDecrypted(storage.decrypted);

			setAccountsEncrypted(accounts.encrypted ?? []);
			setAccountsDecrypted(accounts.decrypted ?? []);
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка загрузки: ${e?.message ?? e}` });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void fetchAllData();
	}, []);

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Box sx={{ display: 'flex', alignItems: 'center' }}>
				<Tabs
					value={dataType}
					onChange={(_, v) => setDataType(v)}
					textColor="inherit"
					indicatorColor="primary"
					sx={{ mb: 1 }}
				>
					<Tab value="storage" label="Ключи" />
					<Tab value="accounts" label="Аккаунты" />
				</Tabs>

				<Button
					color="success"
					sx={{ marginLeft: 'auto' }}
					variant="outlined"
					onClick={() => handleOpenConvertDialog(true)}
				>
					Зашифровать все данные
				</Button>
				<Button
					color="secondary"
					sx={{ marginLeft: '16px' }}
					variant="outlined"
					onClick={() => handleOpenConvertDialog(false)}
				>
					Расшифровать все данные
				</Button>
			</Box>

			{dataType === 'storage' ? (
				<StoragePage
					encrypted={storageEncrypted}
					decrypted={storageDecrypted}
					setEncrypted={setStorageEncrypted}
					setDecrypted={setStorageDecrypted}
					loading={loading}
					saving={savingStorage}
					onSave={saveStorage}
				></StoragePage>
			) : (
				<AccountsPage
					encrypted={accountsEncrypted}
					decrypted={accountsDecrypted}
					setEncrypted={setAccountsEncrypted}
					setDecrypted={setAccountsDecrypted}
					loading={loading}
					saving={savingAccounts}
					onSave={saveAccounts}
				/>
			)}

			<Dialog open={openConvertDialog} onClose={handleCloseConvertDialog}>
				<DialogTitle>{isEncryption ? 'Зашифровать все данные' : 'Расшифровать все данные'}</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 2 }}>
						Все {isEncryption ? 'зашифрованные' : 'расшифрованные'} данные будут перезаписаны. Введите пароль:
					</DialogContentText>

					<TextField
						label="Пароль"
						type="password"
						fullWidth
						margin="normal"
						disabled={loadingConvert}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					{isEncryption && (
						<TextField
							label="Повторите пароль"
							type="password"
							disabled={loadingConvert}
							fullWidth
							margin="normal"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							error={confirmPassword.length > 0 && password !== confirmPassword}
							helperText={confirmPassword.length > 0 && password !== confirmPassword ? 'Пароли не совпадают' : ''}
						/>
					)}
				</DialogContent>
				<DialogActions>
					<Button disabled={loadingConvert} onClick={handleCloseConvertDialog}>
						Отмена
					</Button>
					<Button
						onClick={handleConfirmConvert}
						variant="contained"
						color="primary"
						disabled={!password || (isEncryption && password !== confirmPassword) || loadingConvert}
					>
						{isEncryption ? 'Зашифровать' : 'Расшифровать'}
					</Button>
				</DialogActions>
			</Dialog>
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
