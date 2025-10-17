import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import ConfigPage from '../pages/ConfigPage';
import ResultsPage from '../pages/ResultsPage';
import SecretsPage from '../pages/SecretsPage';

export default function AppRouter() {
	return (
		<BrowserRouter>
			<AppHeader />
			<Routes>
				<Route path="/config" element={<ConfigPage />} />
				<Route path="/results" element={<ResultsPage />} />
				<Route path="/secrets" element={<SecretsPage />} />
				<Route path="/" element={<Navigate to="/config" replace />} />
				<Route path="*" element={<Navigate to="/config" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
