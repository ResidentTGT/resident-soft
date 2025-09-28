import React from 'react';
import { Paper, Typography, Grid, Divider, TextField, Box, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import type { ActionsGroup, LaunchParamsState } from '../../types/config';
import ActionSelector from './fields/ActionSelector';
import DelayArrayInput from './fields/DelayArrayInput';

export default function LaunchParamsForm({
	values,
	onChange,
	actions,
}: {
	values: LaunchParamsState;
	onChange: (patch: Partial<LaunchParamsState>) => void;
	actions: ActionsGroup[];
}) {
	const setField = (key: keyof LaunchParamsState, val: any) => onChange({ [key]: val });
	const setEncField = (key: keyof NonNullable<LaunchParamsState['ENCRYPTION']>, val: any) => {
		onChange({ ENCRYPTION: { ...(values.ENCRYPTION ?? {}), [key]: val } });
	};

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				Настройки запуска (launchParams)
			</Typography>

			<ActionSelector
				actions={actions}
				value={values.ACTION_PARAMS}
				onChange={(next) => onChange({ ACTION_PARAMS: next })}
			/>

			<Divider sx={{ my: 2 }} />

			<Grid container spacing={2}>
				<Grid item xs={12} sm={6}>
					<TextField
						label="Количество потоков"
						type="number"
						size="small"
						fullWidth
						value={values.NUMBER_OF_THREADS ?? ''}
						onChange={(e) =>
							setField('NUMBER_OF_THREADS', e.target.value === '' ? undefined : e.target.valueAsNumber)
						}
						inputProps={{ min: 1 }}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<TextField
						label="Количество запусков"
						type="number"
						size="small"
						fullWidth
						value={values.NUMBER_OF_EXECUTIONS ?? ''}
						onChange={(e) =>
							setField('NUMBER_OF_EXECUTIONS', e.target.value === '' ? undefined : e.target.valueAsNumber)
						}
						inputProps={{ min: 1 }}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<TextField
						label="Попыток до успеха"
						type="number"
						size="small"
						fullWidth
						value={values.ATTEMPTS_UNTIL_SUCCESS ?? ''}
						onChange={(e) =>
							setField('ATTEMPTS_UNTIL_SUCCESS', e.target.value === '' ? undefined : e.target.valueAsNumber)
						}
						inputProps={{ min: 1 }}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<TextField
						label="Ждать цену газа (Gwei)"
						type="number"
						size="small"
						fullWidth
						value={values.WAIT_GAS_PRICE ?? ''}
						onChange={(e) => setField('WAIT_GAS_PRICE', e.target.value === '' ? undefined : e.target.valueAsNumber)}
						inputProps={{ min: 0 }}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<TextField
						label="Задержка после ошибки, с"
						type="number"
						size="small"
						fullWidth
						value={values.DELAY_AFTER_ERROR_IN_S ?? ''}
						onChange={(e) =>
							setField('DELAY_AFTER_ERROR_IN_S', e.target.value === '' ? undefined : e.target.valueAsNumber)
						}
						inputProps={{ min: 0 }}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<TextField
						label="ID сети (CHAIN_ID)"
						type="number"
						size="small"
						fullWidth
						value={values.CHAIN_ID ?? ''}
						onChange={(e) => setField('CHAIN_ID', e.target.value === '' ? undefined : e.target.valueAsNumber)}
					/>
				</Grid>
			</Grid>

			<Box sx={{ mt: 2 }}>
				<FormGroup>
					<FormControlLabel
						control={
							<Checkbox
								checked={!!values.SHUFFLE_ACCOUNTS}
								onChange={(e) => setField('SHUFFLE_ACCOUNTS', e.target.checked)}
							/>
						}
						label="Перемешивать аккаунты"
					/>
					<FormControlLabel
						control={<Checkbox checked={!!values.PROXY} onChange={(e) => setField('PROXY', e.target.checked)} />}
						label="Использовать прокси"
					/>
					<FormControlLabel
						control={
							<Checkbox
								checked={!!values.ROTATE_PROXY}
								onChange={(e) => setField('ROTATE_PROXY', e.target.checked)}
							/>
						}
						label="Ротировать прокси"
					/>
					<FormControlLabel
						control={
							<Checkbox checked={!!values.TAKE_STATE} onChange={(e) => setField('TAKE_STATE', e.target.checked)} />
						}
						label="Сохранять стейт"
					/>
				</FormGroup>
			</Box>

			<Grid container spacing={2} sx={{ mt: 1 }}>
				<Grid item xs={12} sm={6}>
					<TextField
						label="Имя стейта"
						size="small"
						fullWidth
						value={values.STATE_NAME ?? ''}
						onChange={(e) => setField('STATE_NAME', e.target.value || undefined)}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<TextField
						label="Лицензия"
						size="small"
						fullWidth
						value={values.LICENSE ?? ''}
						onChange={(e) => setField('LICENSE', e.target.value || undefined)}
					/>
				</Grid>
			</Grid>

			<Box sx={{ mt: 2 }}>
				<DelayArrayInput
					value={values.DELAY_BETWEEN_ACCS_IN_S}
					onChange={(next) => setField('DELAY_BETWEEN_ACCS_IN_S', next)}
				/>
			</Box>

			<Box sx={{ mt: 2 }}>
				<FormControlLabel
					control={
						<Checkbox
							checked={!!values.USE_ENCRYPTION}
							onChange={(e) => setField('USE_ENCRYPTION', e.target.checked)}
						/>
					}
					label="Использовать шифрование аккаунтов"
				/>
				{values.USE_ENCRYPTION && (
					<Grid container spacing={2} sx={{ mt: 1 }}>
						<Grid item xs={12} md={6}>
							<TextField
								label="ACCOUNTS_ENCRYPTED_PATH"
								size="small"
								fullWidth
								value={values.ENCRYPTION?.ACCOUNTS_ENCRYPTED_PATH ?? ''}
								onChange={(e) => setEncField('ACCOUNTS_ENCRYPTED_PATH', e.target.value || undefined)}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="ACCOUNTS_DECRYPTED_PATH"
								size="small"
								fullWidth
								value={values.ENCRYPTION?.ACCOUNTS_DECRYPTED_PATH ?? ''}
								onChange={(e) => setEncField('ACCOUNTS_DECRYPTED_PATH', e.target.value || undefined)}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="SECRET_STORAGE_ENCRYPTED_PATH"
								size="small"
								fullWidth
								value={values.ENCRYPTION?.SECRET_STORAGE_ENCRYPTED_PATH ?? ''}
								onChange={(e) => setEncField('SECRET_STORAGE_ENCRYPTED_PATH', e.target.value || undefined)}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="SECRET_STORAGE_DECRYPTED_PATH"
								size="small"
								fullWidth
								value={values.ENCRYPTION?.SECRET_STORAGE_DECRYPTED_PATH ?? ''}
								onChange={(e) => setEncField('SECRET_STORAGE_DECRYPTED_PATH', e.target.value || undefined)}
							/>
						</Grid>
					</Grid>
				)}
			</Box>
		</Paper>
	);
}
