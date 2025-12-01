import {
	Paper,
	Grid,
	Divider,
	TextField,
	Box,
	FormGroup,
	FormControlLabel,
	Checkbox,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Chip,
	Typography,
} from '@mui/material';

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
	availableStates,
}: {
	launchParams: LaunchParams;
	onChange: (patch: Partial<LaunchParams>) => void;
	actions: ActionsGroup[];
	accountsFiles: string[];
	availableStates: { name: string; successCount: number; failCount: number }[];
}) {
	const setField = (key: keyof LaunchParams, val: any) => onChange({ [key]: val });

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
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

				<Grid container spacing={2} sx={{ width: '100%' }}>
					<Grid sx={{ xs: 12, sm: 3, width: '180px' }}>
						<FormControlLabel
							control={
								<Checkbox
									checked={!!launchParams.TAKE_STATE}
									disabled={availableStates.length === 0}
									onChange={(e) => {
										const checked = e.target.checked;
										let newStateName = '';

										if (checked) {
											const currentStateName = launchParams.STATE_NAME;
											const stateExists = availableStates.some((s) => s.name === currentStateName);

											if (stateExists) {
												newStateName = currentStateName;
											} else if (availableStates.length > 0) {
												newStateName = availableStates[0].name;
											}
										}

										onChange({
											TAKE_STATE: checked,
											STATE_NAME: newStateName,
										});
									}}
								/>
							}
							label="Учитывать стейт"
						/>
					</Grid>
					{launchParams.TAKE_STATE && (
						<Grid sx={{ xs: 12, sm: 9, width: 'calc(100% - 180px - 32px)' }}>
							<FormControl size="small" fullWidth sx={{ width: '100%' }}>
								<InputLabel>Имя стейта</InputLabel>
								<Select
									label="Имя стейта"
									value={launchParams.STATE_NAME ?? ''}
									onChange={(e) => setField('STATE_NAME', e.target.value)}
									sx={{ width: '100%' }}
								>
									{availableStates.map((state) => (
										<MenuItem key={state.name} value={state.name}>
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
												<Typography>{state.name}</Typography>
												<Chip
													label={`✓ ${state.successCount}`}
													size="small"
													color="success"
													variant="outlined"
												/>
												<Chip
													label={`✗ ${state.failCount}`}
													size="small"
													color="error"
													variant="outlined"
												/>
											</Box>
										</MenuItem>
									))}
								</Select>
							</FormControl>
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
				type="password"
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
					label="Использовать зашифрованные данные"
				/>
			</Box>
		</Paper>
	);
}
