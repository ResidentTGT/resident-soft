import { Grid, TextField } from '@mui/material';

export function StrField({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: string | undefined;
	onChange: (v: string | undefined) => void;
	placeholder?: string;
}) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<TextField
				label={label}
				size="small"
				placeholder={placeholder}
				value={value ?? ''}
				onChange={(e) => onChange(e.target.value || undefined)}
			/>
		</Grid>
	);
}
