import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import AppRouter from './routes/AppRouter';

export default function App() {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<AppRouter />
		</ThemeProvider>
	);
}
