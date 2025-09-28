import React from 'react';
import { Paper, Typography, Alert, Grid, TextField, Checkbox, FormControlLabel, Stack } from '@mui/material';
import { functionParamSchemas } from '../../services/functionParamSchemas';

export default function FunctionParamsForm({
	action,
	values,
	onChange,
}: {
	action?: string;
	values: Record<string, any>;
	onChange: (patch: Record<string, any>) => void;
}) {
	const schema = (action && functionParamSchemas[action]) || undefined;
	const setField = (name: string, val: any) => onChange({ [name]: val });

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				Параметры функции (functionParams)
			</Typography>

			{!action && <Alert severity="info">Выберите действие слева, чтобы настроить параметры.</Alert>}

			{action && schema && schema.length === 0 && (
				<Alert severity="success">Для действия «{action}» дополнительные параметры не требуются.</Alert>
			)}

			{action && !schema && (
				<Alert severity="warning">
					Для действия «{action}» ещё не описана форма. Можно добавить схему позже или временно оставить пустым
					объектом.
				</Alert>
			)}

			{schema && schema.length > 0 && (
				<Grid container spacing={2} sx={{ mt: 0 }}>
					{schema.map((fld) => {
						if (fld.kind === 'number') {
							return (
								<Grid item xs={12} md={6} key={fld.name}>
									<TextField
										label={fld.label}
										type="number"
										size="small"
										fullWidth
										value={values[fld.name] ?? ''}
										onChange={(e) => {
											const v = e.target.value;
											setField(fld.name, v === '' ? undefined : e.target.valueAsNumber);
										}}
										inputProps={{ min: fld.min ?? 0 }}
										required={!!fld.required}
									/>
								</Grid>
							);
						}
						if (fld.kind === 'string') {
							return (
								<Grid item xs={12} md={6} key={fld.name}>
									<TextField
										label={fld.label}
										size="small"
										fullWidth
										value={values[fld.name] ?? ''}
										onChange={(e) => setField(fld.name, e.target.value || undefined)}
										required={!!fld.required}
									/>
								</Grid>
							);
						}
						if (fld.kind === 'boolean') {
							return (
								<Grid item xs={12} md={6} key={fld.name}>
									<FormControlLabel
										control={
											<Checkbox
												checked={!!values[fld.name]}
												onChange={(e) => setField(fld.name, e.target.checked)}
											/>
										}
										label={fld.label}
									/>
								</Grid>
							);
						}
						if (fld.kind === 'numberRange') {
							const val: [number | undefined, number | undefined] = values[fld.name] ?? [undefined, undefined];
							return (
								<Grid item xs={12} key={fld.name}>
									<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
										<TextField
											label={fld.labelMin}
											type="number"
											size="small"
											fullWidth
											value={val?.[0] ?? ''}
											onChange={(e) => {
												const v = e.target.value === '' ? undefined : e.target.valueAsNumber;
												setField(fld.name, [v, val?.[1]]);
											}}
										/>
										<TextField
											label={fld.labelMax}
											type="number"
											size="small"
											fullWidth
											value={val?.[1] ?? ''}
											onChange={(e) => {
												const v = e.target.value === '' ? undefined : e.target.valueAsNumber;
												setField(fld.name, [val?.[0], v]);
											}}
										/>
									</Stack>
								</Grid>
							);
						}
						return null;
					})}
				</Grid>
			)}
		</Paper>
	);
}
