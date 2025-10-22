// AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import AppHeader from '../components/layout/AppHeader';
import ConfigPage from '../pages/ConfigPage';
import ResultsPage from '../pages/ResultsPage';
import SecretsPage from '../pages/secrets/SecretsPage';

export default function AppRouter() {
	return (
		<BrowserRouter>
			<Box
				sx={{
					display: 'grid',
					gridTemplateRows: '64px 1fr',
					height: '100vh',
					minHeight: 0,
				}}
			>
				<Box sx={{ minHeight: 0 }}>
					<AppHeader />
				</Box>

				<Box
					component="main"
					sx={{
						minHeight: 0,
						overflow: 'auto',
					}}
				>
					<Routes>
						<Route path="/config" element={<ConfigPage />} />
						<Route path="/results" element={<ResultsPage />} />
						<Route path="/secrets" element={<SecretsPage />} />
						<Route path="/" element={<Navigate to="/config" replace />} />
						<Route path="*" element={<Navigate to="/config" replace />} />
					</Routes>
				</Box>
			</Box>
		</BrowserRouter>
	);
}
