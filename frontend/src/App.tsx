import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import AppRouter from './routes/AppRouter';
import BackendEventsToast from './components/layout/BackendEventsToast';

export default function App() {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<AppRouter />
			<BackendEventsToast />
		</ThemeProvider>
	);
}
