import { Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { NetworkConfig } from '../../../../../src/utils/network';

export function ChainIdMultiSelect({
	label,
	value,
	onChange,
	networks,
}: {
	label: string;
	value: (number | string)[] | undefined;
	onChange: (v: (number | string)[] | undefined) => void;
	networks: NetworkConfig[];
}) {
	const vals = Array.isArray(value) ? value : [];
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<FormControl size="small">
				<InputLabel>{label}</InputLabel>
				<Select
					multiple
					label={label}
					value={vals as any}
					onChange={(e) => {
						const arr = e.target.value as (number | string)[];
						onChange(arr.length ? arr : undefined);
					}}
					renderValue={(vals) =>
						(vals as (number | string)[])
							.map((v) => networks.find((n) => String(n.chainId) === String(v))?.name ?? String(v))
							.join(', ')
					}
				>
					{networks.map((n) => (
						<MenuItem key={String(n.chainId)} value={n.chainId}>
							{n.name}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Grid>
	);
}
