import { Grid } from '@mui/material';
import { FormControl, InputLabel, Select, MenuItem, TextField, FormHelperText } from '@mui/material';
import type { LaunchParams } from '../../../../../src/utils/types/launchParams.type';
import { useEffect, useState } from 'react';
import type { JobAccount } from '../../../../../src/utils/job';

function parseList(input: string): any[] {
	const parts = input
		.split(/[,\s]+/)
		.map((s) => s.trim())
		.filter(Boolean);
	console.log(parts);

	return parts.map((t) => (/^\d+$/.test(t) ? Number(t) : t));
}

export default function AccountsSelector({
	files,
	value,
	onChange,
}: {
	files: string[];
	value?: LaunchParams['JOB_ACCOUNTS'];
	onChange: (next?: LaunchParams['JOB_ACCOUNTS']) => void;
}) {
	if (!value || !value[0]) throw new Error('no JobAccount');
	const job: JobAccount = value && value[0];

	const push = (next: JobAccount) => {
		if (!next.file) onChange(undefined);
		else onChange([next] as LaunchParams['JOB_ACCOUNTS']);
	};

	const setField = <K extends keyof JobAccount>(key: K, v: JobAccount[K]) => {
		push({ ...job, [key]: v });
	};

	const [includeText, setIncludeText] = useState(Array.isArray(job.include) ? job.include.join(', ') : '');
	const [excludeText, setExcludeText] = useState(Array.isArray(job.exclude) ? job.exclude.join(', ') : '');

	useEffect(() => {
		setIncludeText(Array.isArray(job.include) ? job.include.join(', ') : '');
	}, [job.include]);
	useEffect(() => {
		setExcludeText(Array.isArray(job.exclude) ? job.exclude.join(', ') : '');
	}, [job.exclude]);

	const handleIncludeCommit = (include: boolean) => {
		setField(include ? 'include' : 'exclude', include ? parseList(includeText) : parseList(excludeText));
	};

	return (
		<>
			<Grid container spacing={2} sx={{ mb: 2 }}>
				<Grid sx={{ xs: 12, sm: 6, width: '50%' }}>
					<FormControl fullWidth size="small">
						<InputLabel>Файл с аккаунтами</InputLabel>
						<Select
							label="Файл с аккаунтами"
							value={job.file}
							disabled={!files.length}
							onChange={(e) => setField('file', e.target.value as string)}
						>
							{files.map((name) => (
								<MenuItem key={name} value={name}>
									{name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>

				<Grid sx={{ xs: 12, sm: 6, width: '20%' }}>
					<TextField
						label="От"
						type="number"
						size="small"
						fullWidth
						value={job.start}
						onChange={(e) => setField('start', Number(e.target.value))}
						disabled={!!job.include.length}
					/>
				</Grid>

				<Grid sx={{ xs: 12, sm: 6, width: '20%' }}>
					<TextField
						label="До"
						type="number"
						size="small"
						fullWidth
						value={job.end}
						onChange={(e) => setField('end', Number(e.target.value))}
						disabled={!!job.include.length}
					/>
				</Grid>
			</Grid>
			<Grid container spacing={2} sx={{ mb: 2 }}>
				<Grid sx={{ xs: 12, sm: 6 }}>
					<TextField
						type="text"
						label="Включить только"
						size="small"
						fullWidth
						placeholder="1, 2, 5"
						value={includeText}
						onChange={(e) => setIncludeText(e.target.value)}
						onBlur={() => handleIncludeCommit(true)}
					/>
					<FormHelperText>Номера аккаунтов через запятую</FormHelperText>
				</Grid>

				<Grid sx={{ xs: 12, sm: 6 }}>
					<TextField
						label="Исключить"
						size="small"
						fullWidth
						placeholder="2, 5"
						value={excludeText}
						onChange={(e) => setExcludeText(e.target.value)}
						onBlur={() => handleIncludeCommit(false)}
					/>
				</Grid>
			</Grid>
		</>
	);
}
