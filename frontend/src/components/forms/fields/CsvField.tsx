import { TextField } from '@mui/material';
import React from 'react';

const parseCsv = (s: string) =>
	s
		.split(/[,\n\r\s]+/)
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
		<TextField
			fullWidth
			label={label}
			size="small"
			placeholder={placeholder ?? 'a, b, c\n1, 2, 3'}
			value={text}
			onChange={(e) => setText(e.target.value)}
			onBlur={commit}
			multiline
			minRows={1}
			maxRows={25}
			onKeyDown={(e) => {
				if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					commit();
					e.currentTarget.querySelector('textarea')?.blur();
				}
			}}
		/>
	);
}
