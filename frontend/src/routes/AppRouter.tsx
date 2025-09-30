import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import ConfigPage from '../pages/ConfigPage';
import ProcessPage from '../pages/ProcessPage';

export default function AppRouter() {
	return (
		<BrowserRouter>
			<AppHeader />
			<Routes>
				<Route path="/config" element={<ConfigPage />} />
				<Route path="/process" element={<ProcessPage />} />
				<Route path="/" element={<Navigate to="/config" replace />} />
				<Route path="*" element={<Navigate to="/config" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
