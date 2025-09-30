import React from 'react';
import { Grid, TextField } from '@mui/material';

export default function DelayArrayInput({ value, onChange }: { value?: number[]; onChange: (next?: number[]) => void }) {
	return value ? (
		<Grid container spacing={2} alignItems="center">
			<Grid sx={{ width: '50%' }}>Задержка между аккаунтами, с</Grid>
			<Grid sx={{ width: '20%' }}>
				<TextField
					label="От"
					size="small"
					fullWidth
					value={value[0]}
					onChange={(e) => {
						onChange([+e.target.value, value[1]]);
					}}
				/>
			</Grid>
			<Grid sx={{ width: '20%' }}>
				<TextField
					label="До"
					size="small"
					fullWidth
					value={value[1]}
					onChange={(e) => {
						onChange([value[0], +e.target.value]);
					}}
				/>
			</Grid>
		</Grid>
	) : (
		''
	);
}
