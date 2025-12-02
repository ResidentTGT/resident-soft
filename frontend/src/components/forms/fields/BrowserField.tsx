import { FormControl, Grid, InputLabel, MenuItem, Select } from '@mui/material';

export function BrowserField({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<FormControl size="small">
				<InputLabel>Антидетект браузер</InputLabel>
				<Select label="Антидетект браузер" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
					<MenuItem value="Vision">Vision</MenuItem>
					<MenuItem value="AdsPower">AdsPower</MenuItem>
					<MenuItem value="Afina">Afina</MenuItem>
				</Select>
			</FormControl>
		</Grid>
	);
}
