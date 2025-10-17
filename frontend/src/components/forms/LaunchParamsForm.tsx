import { Paper, Typography, Grid, Divider, TextField, Box, FormGroup, FormControlLabel, Checkbox } from '@mui/material';

import ActionSelector from './fields/ActionSelector';
import DelayArrayInput from './fields/DelayArrayInput';
import type { ActionsGroup } from '../../../../src/actions';
import type { LaunchParams } from '../../../../src/utils/types/launchParams.type';
import AccountsSelector from './fields/AccountsSelector';

export default function LaunchParamsForm({
	launchParams,
	onChange,
	actions,
	accountsFiles,
}: {
	launchParams: LaunchParams;
	onChange: (patch: Partial<LaunchParams>) => void;
	actions: ActionsGroup[];
	accountsFiles: string[];
}) {
	const setField = (key: keyof LaunchParams, val: any) => onChange({ [key]: val });
	const setEncField = (key: keyof NonNullable<LaunchParams['ENCRYPTION']>, val: any) => {
		onChange({ ENCRYPTION: { ...(launchParams.ENCRYPTION ?? {}), [key]: val } });
	};

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				Конфигурация выполнения
			</Typography>

			<Divider sx={{ my: 2 }} />

			<ActionSelector
				actions={actions}
				value={launchParams.ACTION_PARAMS}
				onChange={(next) => onChange({ ACTION_PARAMS: next })}
			/>
			<Divider sx={{ my: 2 }} />
			<AccountsSelector
				files={accountsFiles}
				value={launchParams.JOB_ACCOUNTS}
				onChange={(accs) => onChange({ JOB_ACCOUNTS: accs })}
			/>

			<Divider sx={{ my: 2 }} />

			<Grid container spacing={2} sx={{ mb: 2 }}>
				<Grid sx={{ xs: 12, sm: 6, width: '30%' }}>
					<TextField
						label="Количество запусков"
						type="number"
						size="small"
						fullWidth
						value={launchParams.NUMBER_OF_EXECUTIONS ?? ''}
						onChange={(e) => setField('NUMBER_OF_EXECUTIONS', e.target.value === '' ? undefined : +e.target.value)}
					/>
				</Grid>
				<Grid sx={{ xs: 12, sm: 6, width: '30%' }}>
					<TextField
						label="Количество потоков"
						type="number"
						size="small"
						fullWidth
						value={launchParams.NUMBER_OF_THREADS ?? ''}
						onChange={(e) => setField('NUMBER_OF_THREADS', e.target.value === '' ? undefined : +e.target.value)}
					/>
				</Grid>

				<Grid sx={{ xs: 12, sm: 6, width: '30%' }}>
					<TextField
						label="Попыток до успеха"
						type="number"
						size="small"
						fullWidth
						value={launchParams.ATTEMPTS_UNTIL_SUCCESS ?? ''}
						onChange={(e) => setField('ATTEMPTS_UNTIL_SUCCESS', e.target.value === '' ? undefined : +e.target.value)}
					/>
				</Grid>
			</Grid>

			<Grid container spacing={2}>
				<FormControlLabel
					sx={{ width: '100%' }}
					control={
						<Checkbox
							checked={!!launchParams.SHUFFLE_ACCOUNTS}
							onChange={(e) => setField('SHUFFLE_ACCOUNTS', e.target.checked)}
						/>
					}
					label="Перемешивать аккаунты"
				/>

				<Grid container spacing={2} sx={{ width: '100%' }}>
					<FormControlLabel
						control={
							<Checkbox checked={!!launchParams.PROXY} onChange={(e) => setField('PROXY', e.target.checked)} />
						}
						label="Использовать прокси"
					/>

					{launchParams.PROXY && (
						<FormControlLabel
							control={
								<Checkbox
									checked={!!launchParams.ROTATE_PROXY}
									onChange={(e) => setField('ROTATE_PROXY', e.target.checked)}
								/>
							}
							label="Ротация прокси"
						/>
					)}
				</Grid>
				<Grid container spacing={2}>
					<Grid sx={{ xs: 12, sm: 6 }}>
						<FormControlLabel
							control={
								<Checkbox
									checked={!!launchParams.TAKE_STATE}
									onChange={(e) => setField('TAKE_STATE', e.target.checked)}
								/>
							}
							label="Сохранять и учитывать стейт"
						/>
					</Grid>
					{launchParams.TAKE_STATE && (
						<Grid sx={{ xs: 12, sm: 6 }}>
							<TextField
								label="Имя стейта"
								size="small"
								fullWidth
								value={launchParams.STATE_NAME ?? ''}
								onChange={(e) => setField('STATE_NAME', e.target.value || undefined)}
							/>
						</Grid>
					)}
				</Grid>
			</Grid>

			<Box sx={{ mt: 2 }}>
				<FormGroup>
					<Grid container spacing={2}>
						<DelayArrayInput
							value={launchParams.DELAY_BETWEEN_ACCS_IN_S}
							onChange={(next) => setField('DELAY_BETWEEN_ACCS_IN_S', next)}
						/>
						<Grid sx={{ xs: 12, sm: 6 }}>
							<TextField
								label="Задержка после ошибки, с"
								type="number"
								size="small"
								fullWidth
								value={launchParams.DELAY_AFTER_ERROR_IN_S ?? ''}
								onChange={(e) =>
									setField('DELAY_AFTER_ERROR_IN_S', e.target.value === '' ? undefined : +e.target.value)
								}
							/>
						</Grid>
					</Grid>
				</FormGroup>
			</Box>

			<Divider sx={{ my: 2 }} />

			<TextField
				label="Лицензия"
				size="small"
				fullWidth
				value={launchParams.LICENSE ?? ''}
				onChange={(e) => setField('LICENSE', e.target.value || undefined)}
			/>

			<Box sx={{ mt: 2 }}>
				<FormControlLabel
					control={
						<Checkbox
							checked={!!launchParams.USE_ENCRYPTION}
							onChange={(e) => setField('USE_ENCRYPTION', e.target.checked)}
						/>
					}
					label="Использовать зашифрованные аккаунты"
				/>
				{launchParams.USE_ENCRYPTION && (
					<Grid container spacing={2}>
						<Grid sx={{ xs: 12, sm: 6, width: '100%' }}>
							<TextField
								label="ACCOUNTS_ENCRYPTED_PATH"
								size="small"
								fullWidth
								value={launchParams.ENCRYPTION?.ACCOUNTS_ENCRYPTED_PATH ?? ''}
								onChange={(e) => setEncField('ACCOUNTS_ENCRYPTED_PATH', e.target.value || undefined)}
							/>
						</Grid>
						<Grid sx={{ xs: 12, sm: 6, width: '100%' }}>
							<TextField
								label="ACCOUNTS_DECRYPTED_PATH"
								size="small"
								fullWidth
								value={launchParams.ENCRYPTION?.ACCOUNTS_DECRYPTED_PATH ?? ''}
								onChange={(e) => setEncField('ACCOUNTS_DECRYPTED_PATH', e.target.value || undefined)}
							/>
						</Grid>
						<Grid sx={{ xs: 12, sm: 6, width: '100%' }}>
							<TextField
								label="SECRET_STORAGE_ENCRYPTED_PATH"
								size="small"
								fullWidth
								value={launchParams.ENCRYPTION?.SECRET_STORAGE_ENCRYPTED_PATH ?? ''}
								onChange={(e) => setEncField('SECRET_STORAGE_ENCRYPTED_PATH', e.target.value || undefined)}
							/>
						</Grid>
						<Grid sx={{ xs: 12, sm: 6, width: '100%' }}>
							<TextField
								label="SECRET_STORAGE_DECRYPTED_PATH"
								size="small"
								fullWidth
								value={launchParams.ENCRYPTION?.SECRET_STORAGE_DECRYPTED_PATH ?? ''}
								onChange={(e) => setEncField('SECRET_STORAGE_DECRYPTED_PATH', e.target.value || undefined)}
							/>
						</Grid>
					</Grid>
				)}
			</Box>
		</Paper>
	);
}
