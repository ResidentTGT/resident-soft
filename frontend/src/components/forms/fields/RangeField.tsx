import { Box, TextField } from '@mui/material';
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
		<Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
			<Box sx={{ flex: 1 }}>
				<TextField
					label={labelFrom}
					type="number"
					size="small"
					fullWidth
					value={a ?? ''}
					onChange={(e) => onChange([toNum(e.target.value), b])}
				/>
			</Box>
			<Box sx={{ flex: 1 }}>
				<TextField
					label={labelTo}
					type="number"
					size="small"
					fullWidth
					value={b ?? ''}
					onChange={(e) => onChange([a, toNum(e.target.value)])}
				/>
			</Box>
		</Box>
	);
}
