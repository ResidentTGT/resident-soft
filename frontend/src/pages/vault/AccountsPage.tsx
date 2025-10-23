import React, { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Snackbar,
	Tab,
	Tabs,
	TextField,
	CircularProgress,
	Backdrop,
} from '@mui/material';
import type { Account } from '../../../../src/utils/account/models/account.type';
import type { AccountsFile } from '../../../../src/utils/account';
import AccountsHotTable from './AccountsHotTable';

import {
	getAccounts,
	postAccounts,
	createAccountsFile,
	deleteAccountsFile,
	encryptAccounts,
	decryptAccounts,
} from '../../api/client';

type Variant = 'encrypted' | 'decrypted';
interface Toast {
	open: boolean;
	severity: 'success' | 'error' | 'info' | 'warning';
	message: string;
}

export default function AccountsPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState<Toast>({ open: false, severity: 'success', message: '' });

	const [encrypted, setEncrypted] = useState<AccountsFile[]>([]);
	const [decrypted, setDecrypted] = useState<AccountsFile[]>([]);

	const [variant, setVariant] = useState<Variant>('decrypted');
	const [encSelectedFile, setEncSelectedFile] = useState<string | undefined>();
	const [decSelectedFile, setDecSelectedFile] = useState<string | undefined>();

	const [openCryptDialog, setOpenCryptDialog] = useState(false);
	const [isEncryption, setIsEncryption] = useState(true);
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [cryptLoading, setCryptLoading] = useState(false);

	const [openDelete, setOpenDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [openCreate, setOpenCreate] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newFileName, setNewFileName] = useState('accs_new.xlsx');

	const files = variant === 'encrypted' ? encrypted : decrypted;
	const selectedFileName = variant === 'encrypted' ? encSelectedFile : decSelectedFile;
	const setSelectedFileName = variant === 'encrypted' ? setEncSelectedFile : setDecSelectedFile;

	const selectedFile = useMemo(() => {
		if (!files?.length) return undefined;
		if (selectedFileName) return files.find((f) => f.fileName === selectedFileName) ?? files[0];
		return files[0];
	}, [files, selectedFileName]);

	useEffect(() => {
		if (variant === 'encrypted') {
			if (!encrypted?.length) setEncSelectedFile(undefined);
			else if (!encSelectedFile || !encrypted.some((f) => f.fileName === encSelectedFile)) {
				setEncSelectedFile(encrypted[0].fileName);
			}
		} else {
			if (!decrypted?.length) setDecSelectedFile(undefined);
			else if (!decSelectedFile || !decrypted.some((f) => f.fileName === decSelectedFile)) {
				setDecSelectedFile(decrypted[0].fileName);
			}
		}
	}, [variant, encrypted, decrypted, encSelectedFile, decSelectedFile]);

	const fetchAccounts = async () => {
		setLoading(true);
		try {
			const accs = await getAccounts();
			setEncrypted(accs.encrypted ?? []);
			setDecrypted(accs.decrypted ?? []);
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка загрузки аккаунтов: ${e?.message ?? e}` });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void fetchAccounts();
	}, []);

	const updateAccountsInSelectedFile = (nextAccounts: Account[]) => {
		if (!selectedFile) return;
		const fileName = selectedFile.fileName;
		const setCurrentFiles = variant === 'encrypted' ? setEncrypted : setDecrypted;
		setCurrentFiles((prev) => (prev ?? []).map((f) => (f.fileName === fileName ? { ...f, accounts: nextAccounts } : f)));
	};

	const handleSave = async () => {
		const file = files.find((f) => f.fileName === selectedFile?.fileName);
		if (!file) return;
		setSaving(true);
		try {
			await postAccounts(
				variant === 'encrypted' ? { encrypted: [file], decrypted: [] } : { encrypted: [], decrypted: [file] },
			);
			setToast({ open: true, severity: 'success', message: 'Аккаунты сохранены ✅' });
			await fetchAccounts();
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка сохранения: ${e?.message ?? e}` });
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
			if (isEncryption) await encryptAccounts(password);
			else await decryptAccounts(password);
			setOpenCryptDialog(false);
			setToast({
				open: true,
				severity: 'success',
				message: `Аккаунты ${isEncryption ? 'зашифрованы' : 'расшифрованы'} ✅`,
			});
			await fetchAccounts();
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Не удалось выполнить операцию: ${e?.message ?? e}` });
		} finally {
			setCryptLoading(false);
		}
	};

	const normalizedNewName = useMemo(() => {
		const name = (newFileName ?? '').trim();
		if (!name) return '';
		return name.toLowerCase().endsWith('.xlsx') ? name : `${name}.xlsx`;
	}, [newFileName]);
	const nameExists = useMemo(
		() => normalizedNewName && files.some((f) => f.fileName === normalizedNewName),
		[files, normalizedNewName],
	);

	const confirmCreate = async () => {
		if (!normalizedNewName || nameExists) return;
		setCreating(true);
		try {
			await createAccountsFile({ variant, fileName: normalizedNewName });
			setSelectedFileName(normalizedNewName);
			setOpenCreate(false);
			setToast({ open: true, severity: 'success', message: `Файл ${normalizedNewName} создан ✅` });
			await fetchAccounts();
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Не удалось создать файл: ${e?.message ?? e}` });
		} finally {
			setCreating(false);
		}
	};

	const confirmDelete = async () => {
		if (!selectedFile) return;
		setDeleting(true);
		try {
			await deleteAccountsFile({ variant, fileName: selectedFile.fileName });
			setSelectedFileName(undefined);
			setOpenDelete(false);
			setToast({ open: true, severity: 'success', message: `Файл ${selectedFile.fileName} удалён 🗑️` });
			await fetchAccounts();
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Не удалось удалить файл: ${e?.message ?? e}` });
		} finally {
			setDeleting(false);
		}
	};

	const closeToast = (_e?: any, reason?: string) => {
		if (reason === 'clickaway') return;
		setToast((p) => ({ ...p, open: false }));
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, boxSizing: 'border-box', height: '100%' }}>
			<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
				<Tabs value={variant} onChange={(_, v) => setVariant(v)} textColor="inherit" indicatorColor="primary">
					<Tab value="decrypted" label="Расшифрованные" />
					<Tab value="encrypted" label="Зашифрованные" />
				</Tabs>

				<Button variant="outlined" color="secondary" onClick={() => openEncrypt(true)} sx={{ ml: 'auto' }}>
					Зашифровать аккаунты
				</Button>
				<Button variant="outlined" onClick={() => openEncrypt(false)}>
					Расшифровать аккаунты
				</Button>
			</Box>

			<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
				<FormControl size="small" sx={{ minWidth: 260 }}>
					<InputLabel id="accounts-filename-label">Файл</InputLabel>
					<Select
						key={`sel-${variant}-${files.length}`}
						labelId="accounts-filename-label"
						label="Файл"
						value={selectedFileName ?? files[0]?.fileName ?? ''}
						onChange={(e) => setSelectedFileName(String(e.target.value))}
						disabled={loading || !files.length}
					>
						{files.map((f) => (
							<MenuItem key={f.fileName} value={f.fileName}>
								{f.fileName}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				{variant === 'decrypted' && (
					<Button variant="contained" onClick={handleSave} disabled={!!loading || !!saving || !selectedFile}>
						Сохранить изменения в файле
					</Button>
				)}

				<Button
					variant="outlined"
					onClick={() => {
						setNewFileName('accs_new.xlsx');
						setOpenCreate(true);
					}}
					disabled={loading || saving}
				>
					Создать файл
				</Button>
				<Button
					color="error"
					variant="outlined"
					onClick={() => setOpenDelete(true)}
					disabled={loading || saving || !selectedFile}
				>
					Удалить файл
				</Button>
			</Box>

			{loading ? (
				<Backdrop open>
					<CircularProgress />
				</Backdrop>
			) : !files.length ? (
				<Alert severity="info">
					{variant === 'decrypted' ? 'Нет расшифрованных файлов аккаунтов.' : 'Нет зашифрованных файлов аккаунтов.'}
				</Alert>
			) : !selectedFile ? (
				<Alert severity="warning">Файл не выбран.</Alert>
			) : (
				<AccountsHotTable
					key={`${variant}-${selectedFile.fileName}`}
					value={selectedFile.accounts}
					readOnly={variant === 'encrypted' || !!loading}
					onChange={updateAccountsInSelectedFile}
				/>
			)}

			<Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
				<DialogTitle>Удалить файл</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Вы точно хотите удалить файл <b>{selectedFile?.fileName ?? '(не выбран)'}</b>?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenDelete(false)} disabled={deleting}>
						Отмена
					</Button>
					<Button color="error" variant="contained" onClick={confirmDelete} disabled={!selectedFile || deleting}>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
				<DialogTitle>Создать новый файл</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 2 }}>
						Укажите имя. <code>.xlsx</code> добавится при необходимости.
					</DialogContentText>
					<TextField
						label="Название файла"
						fullWidth
						value={newFileName}
						onChange={(e) => setNewFileName(e.target.value)}
						autoFocus
						error={!!normalizedNewName && !!nameExists}
						helperText={nameExists ? 'Файл уже существует' : ' '}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenCreate(false)} disabled={creating}>
						Отмена
					</Button>
					<Button variant="contained" onClick={confirmCreate} disabled={!normalizedNewName || !!nameExists || creating}>
						Создать
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={openCryptDialog} onClose={() => setOpenCryptDialog(false)}>
				<DialogTitle>{isEncryption ? 'Зашифровать аккаунты' : 'Расшифровать аккаунты'}</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 2 }}>
						{isEncryption ? 'Зашифрованные' : 'Расшифрованные'} файлы аккаунтов будут перезаписаны. Введите пароль:
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
				autoHideDuration={5000}
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
