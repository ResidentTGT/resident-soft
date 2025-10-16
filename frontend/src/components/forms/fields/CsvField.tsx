import { Grid, TextField } from '@mui/material';
import React from 'react';

const parseCsv = (s: string) =>
	s
		.split(/[,\s]+/)
		.map((t) => t.trim())
		.filter(Boolean);

export function CsvField({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: (string | number)[] | undefined;
	onChange: (v: (string | number)[] | undefined) => void;
	placeholder?: string;
}) {
	const initial = React.useMemo(() => (Array.isArray(value) ? value.join(', ') : ''), [JSON.stringify(value ?? [])]);
	const [text, setText] = React.useState(initial);
	React.useEffect(() => setText(initial), [initial]);

	const commit = () => {
		const parts = parseCsv(text);
		if (!parts.length) onChange(undefined);
		else {
			const allNums = parts.every((p) => /^-?\d+(\.\d+)?$/.test(p));
			onChange(allNums ? parts.map(Number) : parts);
		}
	};

	return (
		<Grid sx={{ xs: 12, md: 6, width: '100%' }}>
			<TextField
				label={label}
				size="small"
				placeholder={placeholder ?? 'a, b, c  |  1, 2, 3'}
				value={text}
				onChange={(e) => setText(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						commit();
						(e.currentTarget as HTMLInputElement).blur();
					}
				}}
			/>
		</Grid>
	);
}
