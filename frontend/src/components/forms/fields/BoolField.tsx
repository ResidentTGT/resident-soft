import { Grid, FormControlLabel, Checkbox } from '@mui/material';

export function BoolField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<FormControlLabel
				control={<Checkbox checked={!!checked} onChange={(e) => onChange(e.target.checked)} />}
				label={label}
			/>
		</Grid>
	);
}
