import { useState } from 'react';
import { Box, Container, Tab, Tabs } from '@mui/material';
import StoragePage from './StoragePage';
import AccountsPage from './AccountsPage';

type DataType = 'accounts' | 'storage';

export default function VaultPage() {
	const [dataType, setDataType] = useState<DataType>('accounts');

	return (
		<Container maxWidth="xl" sx={{ py: 2 }}>
			<Box sx={{ display: 'flex', alignItems: 'center' }}>
				<Tabs
					value={dataType}
					onChange={(_, v) => setDataType(v)}
					textColor="inherit"
					indicatorColor="primary"
					sx={{ mb: 2 }}
				>
					<Tab value="accounts" label="Аккаунты" />
					<Tab value="storage" label="Ключи" />
				</Tabs>
			</Box>
			{dataType === 'storage' ? <StoragePage /> : <AccountsPage />}
		</Container>
	);
}
