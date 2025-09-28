import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import ConfigPage from '../pages/ConfigPage';
import ProcessPage from '../pages/ProcessPage';
import { useConfigState } from '../state/useConfig';

export default function AppRouter() {
	const { launchParams, setLaunchParams, functionParams, setFunctionParams, actions, loading, saving, formInvalid, save } =
		useConfigState();

	if (loading) {
		return <div style={{ padding: 16 }}>Загрузка…</div>;
	}

	return (
		<BrowserRouter>
			<AppHeader />
			<Routes>
				<Route
					path="/config"
					element={
						<ConfigPage
							launchParams={launchParams}
							setLaunchParams={setLaunchParams}
							functionParams={functionParams}
							setFunctionParams={setFunctionParams}
							actions={actions}
							onSave={save}
							saving={saving}
							formInvalid={formInvalid}
						/>
					}
				/>
				<Route path="/process" element={<ProcessPage />} />
				<Route path="/" element={<Navigate to="/config" replace />} />
				<Route path="*" element={<Navigate to="/config" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
