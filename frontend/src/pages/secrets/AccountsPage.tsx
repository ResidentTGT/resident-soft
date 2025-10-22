import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Tab, Tabs } from '@mui/material';

import type { Account } from '../../../../src/utils/account/models/account.type';
import AccountsHotTable from './AccountsHotTable';

export interface AccountsFile {
	fileName: string;
	accounts: Account[];
}

interface Props {
	encrypted: AccountsFile[];
	decrypted: AccountsFile[];
	setEncrypted: React.Dispatch<React.SetStateAction<AccountsFile[]>>;
	setDecrypted: React.Dispatch<React.SetStateAction<AccountsFile[]>>;
	loading: boolean;
	saving: boolean;
	onSave: () => Promise<void> | void;
}

type Variant = 'encrypted' | 'decrypted';

export default function AccountsPage({ encrypted, decrypted, setEncrypted, setDecrypted, loading, saving, onSave }: Props) {
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
	}, [variant, encrypted, decrypted]);

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
		await onSave();
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
						labelId="accounts-filename-label"
						label="Файл"
						value={selectedFile?.fileName}
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
					<Button
						variant="contained"
						onClick={handleSave}
						disabled={!!loading || !!saving || !selectedFile}
						sx={{ ml: 'auto' }}
					>
						Сохранить изменения
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
		</Paper>
	);
}
