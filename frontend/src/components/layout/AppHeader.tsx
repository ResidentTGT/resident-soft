import React from 'react';
import { AppBar, Tabs, Tab, Toolbar as MuiToolbar, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export default function AppHeader() {
	const location = useLocation();
	const value = location.pathname.startsWith('/process') ? 'process' : 'config';

	return (
		<AppBar position="sticky">
			<MuiToolbar sx={{ gap: 3 }}>
				<Typography variant="h6" sx={{ flexShrink: 0 }}>
					Resident Soft
				</Typography>
				<Tabs value={value} textColor="inherit" indicatorColor="secondary">
					<Tab label="Редактор конфига" value="config" component={RouterLink} to="/config" />
					<Tab label="Процесс" value="process" component={RouterLink} to="/process" />
				</Tabs>
			</MuiToolbar>
		</AppBar>
	);
}
