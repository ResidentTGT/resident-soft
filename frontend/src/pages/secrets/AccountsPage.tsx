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
	Tab,
	Tabs,
	TextField,
} from '@mui/material';

import type { Account } from '../../../../src/utils/account/models/account.type';
import AccountsHotTable from './AccountsHotTable';
import type { AccountsFile } from '../../../../src/utils/account';

interface Props {
	encrypted: AccountsFile[];
	decrypted: AccountsFile[];
	setEncrypted: React.Dispatch<React.SetStateAction<AccountsFile[]>>;
	setDecrypted: React.Dispatch<React.SetStateAction<AccountsFile[]>>;
	loading: boolean;
	saving: boolean;
	onSave: (toSave: { encrypted: AccountsFile[]; decrypted: AccountsFile[] }) => Promise<void> | void;
	onDeleteFile?: (opts: { variant: Variant; fileName: string }) => Promise<void>;
	onCreateFile?: (opts: { variant: Variant; fileName: string }) => Promise<void>;
}

export type Variant = 'encrypted' | 'decrypted';

export default function AccountsPage({
	encrypted,
	decrypted,
	setEncrypted,
	setDecrypted,
	loading,
	saving,
	onSave,
	onDeleteFile,
	onCreateFile,
}: Props) {
	const [variant, setVariant] = useState<Variant>('decrypted');

	const [encSelectedFile, setEncSelectedFile] = useState<string | undefined>(undefined);
	const [decSelectedFile, setDecSelectedFile] = useState<string | undefined>(undefined);

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
			if (!encrypted?.length) {
				setEncSelectedFile(undefined);
			} else if (!encSelectedFile || !encrypted.some((f) => f.fileName === encSelectedFile)) {
				setEncSelectedFile(encrypted[0].fileName);
			}
		} else {
			if (!decrypted?.length) {
				setDecSelectedFile(undefined);
			} else if (!decSelectedFile || !decrypted.some((f) => f.fileName === decSelectedFile)) {
				setDecSelectedFile(decrypted[0].fileName);
			}
		}
	}, [variant, encrypted, decrypted, encSelectedFile, decSelectedFile]);

	const updateAccountsInSelectedFile = (nextAccounts: Account[]) => {
		if (!selectedFile) return;
		const fileName = selectedFile.fileName;
		const setCurrentFiles = variant === 'encrypted' ? setEncrypted : setDecrypted;
		setCurrentFiles((prev) => {
			const arr = (prev ?? []).map((f) => (f.fileName === fileName ? { ...f, accounts: nextAccounts } : f));
			return arr;
		});
	};

	const handleSave = async () => {
		if (!onSave) return;
		const file = files.find((f) => f.fileName === selectedFile?.fileName);
		if (!file) return;
		const toSave = variant === 'encrypted' ? { encrypted: [file], decrypted: [] } : { decrypted: [file], encrypted: [] };
		await onSave(toSave);
	};

	const [openDelete, setOpenDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const confirmDelete = async () => {
		if (!onDeleteFile || !selectedFile) return;
		try {
			setDeleting(true);
			await onDeleteFile({ variant, fileName: selectedFile.fileName });
			setSelectedFileName(undefined);
			setOpenDelete(false);
		} finally {
			setDeleting(false);
		}
	};

	const [openCreate, setOpenCreate] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newFileName, setNewFileName] = useState('accs_new.xlsx');

	const normalizedNewName = useMemo(() => {
		const name = (newFileName ?? '').trim();
		if (!name) return '';
		return name.toLowerCase().endsWith('.xlsx') ? name : `${name}.xlsx`;
	}, [newFileName]);

	const nameExists = useMemo(() => {
		if (!normalizedNewName) return false;
		return files.some((f) => f.fileName === normalizedNewName);
	}, [files, normalizedNewName]);

	const confirmCreate = async () => {
		if (!onCreateFile || !normalizedNewName || nameExists) return;
		try {
			setCreating(true);
			await onCreateFile({ variant, fileName: normalizedNewName });
			setSelectedFileName(normalizedNewName);
			setOpenCreate(false);
		} finally {
			setCreating(false);
		}
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, height: 'calc(100% - 56px)' }}>
			<Tabs value={variant} onChange={(_, v) => setVariant(v)} textColor="inherit" indicatorColor="primary" sx={{ mb: 2 }}>
				<Tab value="decrypted" label="Расшифрованные" />
				<Tab value="encrypted" label="Зашифрованные" />
			</Tabs>

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
					color="error"
					variant="outlined"
					onClick={() => setOpenDelete(true)}
					disabled={loading || saving || !selectedFile}
				>
					Удалить файл
				</Button>

				{variant === 'decrypted' && (
					<Button
						variant="contained"
						onClick={() => {
							setNewFileName('accounts_new.xlsx');
							setOpenCreate(true);
						}}
						disabled={loading || saving}
						sx={{ ml: 'auto' }}
					>
						Создать новый файл
					</Button>
				)}
			</Box>

			{!files.length ? (
				<Alert severity="info">
					{variant === 'decrypted' ? 'Нет расшифрованных файлов аккаунтов.' : 'Нет зашифрованных файлов аккаунтов.'}
				</Alert>
			) : !selectedFile ? (
				<Alert severity="warning">Файл не выбран.</Alert>
			) : (
				<AccountsHotTable
					key={`${variant}-${selectedFile.fileName}`} // удобный remount при смене файла/таба
					value={selectedFile.accounts}
					readOnly={variant === 'encrypted' || !!loading}
					onChange={updateAccountsInSelectedFile}
				/>
			)}

			<Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
				<DialogTitle>Удалить файл</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Вы точно хотите удалить файл с аккаунтами <b>{selectedFile?.fileName ?? '(не выбран)'}</b>?
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
						Укажите название файла. Расширение <code>.csv</code> добавится автоматически при необходимости.
					</DialogContentText>
					<TextField
						label="Название файла"
						fullWidth
						value={newFileName}
						onChange={(e) => setNewFileName(e.target.value)}
						autoFocus
						error={!!normalizedNewName && nameExists}
						helperText={nameExists ? 'Файл с таким именем уже существует' : ' '}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenCreate(false)} disabled={creating}>
						Отмена
					</Button>
					<Button variant="contained" onClick={confirmCreate} disabled={!normalizedNewName || nameExists || creating}>
						Создать
					</Button>
				</DialogActions>
			</Dialog>
		</Paper>
	);
}
