import React from 'react';
import { Container, Paper, Alert } from '@mui/material';

export default function ProcessPage() {
	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			<Paper variant="outlined" sx={{ p: 3 }}>
				<Alert severity="info">Раздел в разработке. Здесь будет мониторинг/лог выполнения.</Alert>
			</Paper>
		</Container>
	);
}
