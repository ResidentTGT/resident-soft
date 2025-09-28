import React from 'react';
import { TextField } from '@mui/material';

export default function DelayArrayInput({ value, onChange }: { value?: number[]; onChange: (next?: number[]) => void }) {
	return (
		<TextField
			label="Задержки между аккаунтами (с), через запятую"
			size="small"
			fullWidth
			value={(value ?? []).join(', ')}
			onChange={(e) => {
				const raw = e.target.value;
				const arr = raw
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0)
					.map((s) => Number(s))
					.filter((n) => !Number.isNaN(n) && n >= 0);
				onChange(arr.length ? arr : undefined);
			}}
			placeholder="например: 2, 5, 10"
		/>
	);
}
