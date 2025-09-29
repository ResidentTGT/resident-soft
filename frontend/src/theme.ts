// src/theme.ts
import { createTheme } from '@mui/material/styles';

const BRAND_PURPLE = '#7654a8';
const BRAND_YELLOW = '#fdcc05';
const BG = '#191919';
const PAPER = '#1f1f1f';
const TEXT = '#ffffffff';

export const theme = createTheme({
	palette: {
		mode: 'dark',
		primary: { main: BRAND_PURPLE, contrastText: TEXT },
		secondary: { main: BRAND_YELLOW, contrastText: '#191919' },
		background: { default: BG, paper: PAPER },
		text: {
			primary: TEXT,
			secondary: 'rgba(231,229,216,0.72)',
		},
		divider: 'rgba(231,229,216,0.12)',
	},
	shape: { borderRadius: 12 },
	typography: {
		fontFamily: `'Roboto', system-ui, Avenir, Helvetica, Arial, sans-serif`,
		button: { textTransform: 'none', fontWeight: 400 },
	},
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				':root': {
					'--brand-yellow': BRAND_YELLOW,
					'--brand-purple': BRAND_PURPLE,
					'--text': TEXT,
				},
				body: { backgroundColor: BG, color: TEXT },
			},
		},

		MuiPaper: {
			// defaultProps: { elevation: 0 },
			styleOverrides: { root: { backgroundImage: 'none', backgroundColor: PAPER } },
		},
	},
});
