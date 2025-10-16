import { Grid, TextField } from '@mui/material';
import { toNum } from './NumField';

export function RangeField({
	labelFrom,
	labelTo,
	value,
	onChange,
}: {
	labelFrom: string;
	labelTo: string;
	value: [number | undefined, number | undefined];
	onChange: (v: [number | undefined, number | undefined]) => void;
}) {
	const [a, b] = value ?? [];
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<Grid container spacing={2}>
				<Grid sx={{ xs: 12, md: 6 }}>
					<TextField
						label={labelFrom}
						type="number"
						size="small"
						fullWidth
						value={a ?? ''}
						onChange={(e) => onChange([toNum(e.target.value), b])}
					/>
				</Grid>
				<Grid sx={{ xs: 12, md: 6 }}>
					<TextField
						label={labelTo}
						type="number"
						size="small"
						fullWidth
						value={b ?? ''}
						onChange={(e) => onChange([a, toNum(e.target.value)])}
					/>
				</Grid>
			</Grid>
		</Grid>
	);
}
