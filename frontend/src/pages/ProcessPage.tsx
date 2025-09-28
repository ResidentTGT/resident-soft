import React from 'react';
import { Container, Paper, Typography, Alert } from '@mui/material';

export default function ProcessPage() {
	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			<Paper variant="outlined" sx={{ p: 3 }}>
				<Typography variant="h6" gutterBottom>
					Процесс выполнения
				</Typography>
				<Alert severity="info">Раздел в разработке. Здесь будет мониторинг/лог выполнения.</Alert>
			</Paper>
		</Container>
	);
}
