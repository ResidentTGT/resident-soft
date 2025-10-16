import { Grid, TextField } from '@mui/material';

export const toNum = (v: string) => (v === '' ? undefined : Number.isNaN(Number(v)) ? undefined : Number(v));

export function NumField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number | undefined;
	onChange: (v: number | undefined) => void;
}) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<TextField
				label={label}
				type="number"
				size="small"
				value={value ?? ''}
				onChange={(e) => onChange(toNum(e.target.value))}
			/>
		</Grid>
	);
}
