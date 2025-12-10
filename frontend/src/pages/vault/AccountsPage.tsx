import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SelectChangeEvent } from '@mui/material';
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
	IconButton,
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
	Tooltip,
	Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Account } from '../../../../src/utils/account/models/account.type';
import type { AccountsFile } from '../../../../src/utils/account';
import AccountsHotTable from './AccountsHotTable';

import {
	getAccounts,
	postAccounts,
	createAccountsFile,
	deleteAccountsFile,
	deleteAllAccountsFiles,
	encryptAccounts,
	decryptAccounts,
} from '../../api';

// Constants
const DEFAULT_NEW_FILENAME = 'accs_new.xlsx';
const FILE_SELECT_MIN_WIDTH = 260;
const TOAST_AUTO_HIDE_DURATION = 5000;

type Variant = 'encrypted' | 'decrypted';

interface Toast {
	open: boolean;
	severity: 'success' | 'error' | 'info' | 'warning';
	message: string;
}

// Type guard for error messages
const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	return String(error);
};

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
	const [openDeleteAll, setOpenDeleteAll] = useState(false);
	const [deletingAll, setDeletingAll] = useState(false);
	const [openCreate, setOpenCreate] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newFileName, setNewFileName] = useState(DEFAULT_NEW_FILENAME);

	// Derived state based on current variant
	const files = useMemo(() => (variant === 'encrypted' ? encrypted : decrypted), [variant, encrypted, decrypted]);
	const selectedFileName = useMemo(
		() => (variant === 'encrypted' ? encSelectedFile : decSelectedFile),
		[variant, encSelectedFile, decSelectedFile],
	);
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

	const fetchAccounts = useCallback(async () => {
		setLoading(true);
		try {
			const accounts = await getAccounts();
			setEncrypted(accounts.encrypted ?? []);
			setDecrypted(accounts.decrypted ?? []);
		} catch (error: unknown) {
			setToast({
				open: true,
				severity: 'error',
				message: `Ошибка загрузки аккаунтов: ${getErrorMessage(error)}`,
			});
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchAccounts();
	}, [fetchAccounts]);

	const updateAccountsInSelectedFile = useCallback(
		(nextAccounts: Account[]) => {
			if (!selectedFile) return;
			const fileName = selectedFile.fileName;
			const setCurrentFiles = variant === 'encrypted' ? setEncrypted : setDecrypted;
			setCurrentFiles((prev) => prev.map((file) => (file.fileName === fileName ? { ...file, accounts: nextAccounts } : file)));
		},
		[selectedFile, variant],
	);

	const handleSave = useCallback(async () => {
		const file = files.find((file) => file.fileName === selectedFile?.fileName);
		if (!file) return;

		setSaving(true);
		try {
			await postAccounts(
				variant === 'encrypted' ? { encrypted: [file], decrypted: [] } : { encrypted: [], decrypted: [file] },
			);
			setToast({ open: true, severity: 'success', message: 'Аккаунты сохранены ✅' });
		} catch (error: unknown) {
			setToast({
				open: true,
				severity: 'error',
				message: `Ошибка сохранения: ${getErrorMessage(error)}`,
			});
		} finally {
			setSaving(false);
		}
	}, [files, selectedFile, variant]);

	const openEncrypt = useCallback((isEncryption: boolean) => {
		setIsEncryption(isEncryption);
		setPassword('');
		setConfirm('');
		setOpenCryptDialog(true);
	}, []);

	const confirmCrypt = useCallback(async () => {
		if (!password || (isEncryption && password !== confirm)) return;

		setCryptLoading(true);
		try {
			if (isEncryption) {
				await encryptAccounts(password);
			} else {
				await decryptAccounts(password);
			}

			setOpenCryptDialog(false);
			setToast({
				open: true,
				severity: 'success',
				message: `Аккаунты ${isEncryption ? 'зашифрованы' : 'расшифрованы'} ✅`,
			});
			await fetchAccounts();
		} catch (error: unknown) {
			setToast({
				open: true,
				severity: 'error',
				message: `Не удалось выполнить операцию: ${getErrorMessage(error)}`,
			});
		} finally {
			setCryptLoading(false);
		}
	}, [password, isEncryption, confirm, fetchAccounts]);

	const normalizedNewName = useMemo(() => {
		const name = (newFileName ?? '').trim();
		if (!name) return '';
		return name.toLowerCase().endsWith('.xlsx') ? name : `${name}.xlsx`;
	}, [newFileName]);
	const nameExists = useMemo(
		() => normalizedNewName && files.some((f) => f.fileName === normalizedNewName),
		[files, normalizedNewName],
	);

	const confirmCreate = useCallback(async () => {
		if (!normalizedNewName || nameExists) return;

		setCreating(true);
		try {
			await createAccountsFile({ variant, fileName: normalizedNewName });
			setSelectedFileName(normalizedNewName);
			setOpenCreate(false);
			setToast({ open: true, severity: 'success', message: `Файл ${normalizedNewName} создан ✅` });
			await fetchAccounts();
		} catch (error: unknown) {
			setToast({
				open: true,
				severity: 'error',
				message: `Не удалось создать файл: ${getErrorMessage(error)}`,
			});
		} finally {
			setCreating(false);
		}
	}, [normalizedNewName, nameExists, variant, setSelectedFileName, fetchAccounts]);

	const confirmDelete = useCallback(async () => {
		if (!selectedFile) return;

		setDeleting(true);
		try {
			await deleteAccountsFile({ variant, fileName: selectedFile.fileName });
			setSelectedFileName(undefined);
			setOpenDelete(false);
			setToast({ open: true, severity: 'success', message: `Файл ${selectedFile.fileName} удалён 🗑️` });
			await fetchAccounts();
		} catch (error: unknown) {
			setToast({
				open: true,
				severity: 'error',
				message: `Не удалось удалить файл: ${getErrorMessage(error)}`,
			});
		} finally {
			setDeleting(false);
		}
	}, [selectedFile, variant, setSelectedFileName, fetchAccounts]);

	const confirmDeleteAll = useCallback(async () => {
		setDeletingAll(true);
		try {
			const result = await deleteAllAccountsFiles({ variant });
			setSelectedFileName(undefined);
			setOpenDeleteAll(false);
			setToast({
				open: true,
				severity: 'success',
				message: `Удалено ${result.deleted} файлов 🗑️`,
			});
			await fetchAccounts();
		} catch (error: unknown) {
			setToast({
				open: true,
				severity: 'error',
				message: `Не удалось удалить файлы: ${getErrorMessage(error)}`,
			});
		} finally {
			setDeletingAll(false);
		}
	}, [variant, setSelectedFileName, fetchAccounts]);

	const closeToast = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
		if (reason === 'clickaway') return;
		setToast((prev) => ({ ...prev, open: false }));
	}, []);

	const handleTabChange = useCallback((_event: React.SyntheticEvent, value: Variant) => {
		setVariant(value);
	}, []);

	const handleFileChange = useCallback(
		(event: SelectChangeEvent<string>) => {
			setSelectedFileName(event.target.value);
		},
		[setSelectedFileName],
	);

	const handleOpenCreateDialog = useCallback(() => {
		setNewFileName(DEFAULT_NEW_FILENAME);
		setOpenCreate(true);
	}, []);

	const handleCloseCreateDialog = useCallback(() => {
		setOpenCreate(false);
	}, []);

	const handleCloseDeleteDialog = useCallback(() => {
		setOpenDelete(false);
	}, []);

	const handleOpenDeleteDialog = useCallback(() => {
		setOpenDelete(true);
	}, []);

	const handleCloseDeleteAllDialog = useCallback(() => {
		setOpenDeleteAll(false);
	}, []);

	const handleOpenDeleteAllDialog = useCallback(() => {
		setOpenDeleteAll(true);
	}, []);

	const handleCloseCryptDialog = useCallback(() => {
		setOpenCryptDialog(false);
	}, []);

	const handleNewFileNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setNewFileName(event.target.value);
	}, []);

	const handlePasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(event.target.value);
	}, []);

	const handleConfirmChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setConfirm(event.target.value);
	}, []);

	const handleCryptKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === 'Enter' && password && (!isEncryption || password === confirm)) {
				void confirmCrypt();
			}
		},
		[password, isEncryption, confirm, confirmCrypt],
	);

	const handleCreateKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === 'Enter' && normalizedNewName && !nameExists) {
				void confirmCreate();
			}
		},
		[normalizedNewName, nameExists, confirmCreate],
	);

	return (
		<Paper variant="outlined" sx={{ p: 2, boxSizing: 'border-box', height: '100%' }}>
			<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
				<Tabs value={variant} onChange={handleTabChange} textColor="inherit" indicatorColor="primary">
					<Tab value="decrypted" label="Расшифрованные" />
					<Tab value="encrypted" label="Зашифрованные" />
				</Tabs>

				<Button variant="outlined" color="success" onClick={() => openEncrypt(true)} sx={{ ml: 'auto' }}>
					Зашифровать аккаунты
				</Button>
				<Button variant="outlined" color="secondary" onClick={() => openEncrypt(false)}>
					Расшифровать аккаунты
				</Button>
			</Box>

			<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
				<FormControl size="small" sx={{ minWidth: FILE_SELECT_MIN_WIDTH }}>
					<InputLabel id="accounts-filename-label">Файл</InputLabel>
					<Select
						labelId="accounts-filename-label"
						label="Файл"
						value={selectedFileName ?? files[0]?.fileName ?? ''}
						onChange={handleFileChange}
						disabled={loading || !files.length}
					>
						{files.map((file) => (
							<MenuItem key={file.fileName} value={file.fileName}>
								{file.fileName}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				{variant === 'decrypted' && (
					<>
						<Button variant="contained" onClick={handleSave} disabled={loading || saving || !selectedFile}>
							Сохранить изменения в файле
						</Button>
						<Tooltip title="Создать новый файл">
							<span>
								<IconButton
									color="success"
									onClick={handleOpenCreateDialog}
									disabled={loading || saving}
									aria-label="Создать новый файл"
								>
									<AddIcon />
								</IconButton>
							</span>
						</Tooltip>
					</>
				)}

				<Tooltip title="Удалить выбранный файл">
					<span>
						<IconButton
							color="error"
							onClick={handleOpenDeleteDialog}
							disabled={loading || saving || !selectedFile}
							aria-label="Удалить выбранный файл"
						>
							<DeleteIcon />
						</IconButton>
					</span>
				</Tooltip>
				<Button
					color="error"
					variant="outlined"
					onClick={handleOpenDeleteAllDialog}
					disabled={loading || saving || !files.length}
				>
					Удалить все файлы
				</Button>
			</Box>

			{loading ? (
				<Backdrop open aria-label="Загрузка аккаунтов">
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
					readOnly={variant === 'encrypted' || loading}
					onChange={updateAccountsInSelectedFile}
				/>
			)}

			<Dialog open={openDelete} onClose={deleting ? undefined : handleCloseDeleteDialog} disableEscapeKeyDown={deleting}>
				<DialogTitle>Удалить файл</DialogTitle>
				<DialogContent>
					<DialogContentText>
						<Typography color="error" fontWeight="bold" sx={{ mb: 1 }}>
							ВНИМАНИЕ! Это действие необратимо!
						</Typography>
						Вы точно хотите удалить файл <b>{selectedFile?.fileName ?? '(не выбран)'}</b>?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDeleteDialog} disabled={deleting}>
						Отмена
					</Button>
					<Button color="error" variant="contained" onClick={confirmDelete} disabled={!selectedFile || deleting}>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog
				open={openDeleteAll}
				onClose={deletingAll ? undefined : handleCloseDeleteAllDialog}
				disableEscapeKeyDown={deletingAll}
			>
				<DialogTitle>Удалить все файлы</DialogTitle>
				<DialogContent>
					<DialogContentText>
						<Typography color="error" fontWeight="bold" sx={{ mb: 1 }}>
							ВНИМАНИЕ! Это действие необратимо!
						</Typography>
						Вы точно хотите удалить все {variant === 'encrypted' ? 'зашифрованные' : 'расшифрованные'} файлы
						аккаунтов?
						<br />
						<br />
						Будет удалено файлов: <b>{files.length}</b>
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDeleteAllDialog} disabled={deletingAll}>
						Отмена
					</Button>
					<Button color="error" variant="contained" onClick={confirmDeleteAll} disabled={deletingAll}>
						Удалить все
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={openCreate} onClose={creating ? undefined : handleCloseCreateDialog} disableEscapeKeyDown={creating}>
				<DialogTitle>Создать новый файл</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 2 }}>
						Укажите имя. <code>.xlsx</code> добавится при необходимости.
					</DialogContentText>
					<TextField
						label="Название файла"
						fullWidth
						value={newFileName}
						onChange={handleNewFileNameChange}
						onKeyDown={handleCreateKeyDown}
						autoFocus
						error={Boolean(normalizedNewName && nameExists)}
						helperText={nameExists ? 'Файл уже существует' : ' '}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseCreateDialog} disabled={creating}>
						Отмена
					</Button>
					<Button variant="contained" onClick={confirmCreate} disabled={!normalizedNewName || nameExists || creating}>
						Создать
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog
				open={openCryptDialog}
				onClose={cryptLoading ? undefined : handleCloseCryptDialog}
				disableEscapeKeyDown={cryptLoading}
			>
				<DialogTitle>{isEncryption ? 'Зашифровать аккаунты' : 'Расшифровать аккаунты'}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						<Typography color="text.primary">
							{isEncryption ? 'Зашифрованные' : 'Расшифрованные'} файлы аккаунтов будут перезаписаны.
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
						onChange={handlePasswordChange}
						onKeyDown={handleCryptKeyDown}
						autoFocus
					/>
					{isEncryption && (
						<TextField
							label="Повторите пароль"
							type="password"
							fullWidth
							margin="normal"
							disabled={cryptLoading}
							value={confirm}
							onChange={handleConfirmChange}
							onKeyDown={handleCryptKeyDown}
							error={Boolean(confirm && password !== confirm)}
							helperText={confirm && password !== confirm ? 'Пароли не совпадают' : ''}
						/>
					)}
				</DialogContent>
				<DialogActions>
					<Button disabled={cryptLoading} onClick={handleCloseCryptDialog}>
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
				autoHideDuration={TOAST_AUTO_HIDE_DURATION}
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
