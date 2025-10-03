import { AppBar, Tabs, Tab, Toolbar as MuiToolbar, Typography, Avatar, Box } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { titleSx, toolbarSx } from './AppHeader.styles';
import logoPng from '../../../assets/ava-round.png';

export default function AppHeader() {
	const location = useLocation();
	const value = location.pathname.startsWith('/process') ? 'process' : 'config';

	return (
		<AppBar position="sticky">
			<MuiToolbar sx={toolbarSx}>
				<Box
					component={RouterLink}
					to="/"
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1.25,
						textDecoration: 'none',
						color: 'inherit',
						marginLeft: '30px',
					}}
				>
					<Avatar src={logoPng} alt="Resident Soft" sx={{ width: 32, height: 32 }} />
					<Typography variant="h6" sx={titleSx}>
						Resident Soft
					</Typography>
				</Box>

				<Tabs value={value} textColor="inherit" indicatorColor="secondary">
					<Tab label="Настройка запуска" value="config" component={RouterLink} to="/config" />
					<Tab label="Результаты запусков" value="process" component={RouterLink} to="/process" />
				</Tabs>
			</MuiToolbar>
		</AppBar>
	);
}
