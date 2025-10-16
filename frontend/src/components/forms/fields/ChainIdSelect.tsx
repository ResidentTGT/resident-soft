import { Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { ChainId, NetworkConfig } from '../../../../../src/utils/network';

export function ChainIdSelect({
	label,
	value,
	onChange,
	networks,
}: {
	label: string;
	value: number | string | undefined;
	onChange: (v: ChainId) => void;
	networks: NetworkConfig[];
}) {
	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<FormControl size="small">
				<InputLabel>{label}</InputLabel>
				<Select label={label} value={value} onChange={(e) => onChange(e.target.value as ChainId)}>
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
