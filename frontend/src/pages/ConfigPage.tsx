import React from 'react';
import { Box, Button, Container, Paper, Stack, Typography, Grid } from '@mui/material';
import LaunchParamsForm from '../components/forms/LaunchParamsForm';
import FunctionParamsForm from '../components/forms/FunctionParamsForm';
import type { ActionsGroup, LaunchParamsState } from '../types/config';

export default function ConfigPage({
	launchParams,
	setLaunchParams,
	functionParams,
	setFunctionParams,
	actions,
	onSave,
	saving,
	formInvalid,
}: {
	launchParams: LaunchParamsState;
	setLaunchParams: React.Dispatch<React.SetStateAction<LaunchParamsState>>;
	functionParams: Record<string, any>;
	setFunctionParams: React.Dispatch<React.SetStateAction<Record<string, any>>>;
	actions: ActionsGroup[];
	onSave: () => void;
	saving: boolean;
	formInvalid: boolean;
}) {
	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			<Grid container spacing={2} sx={{ mt: 0 }}>
				<Grid item xs={12} md={6}>
					<LaunchParamsForm
						values={launchParams}
						onChange={(patch) => setLaunchParams((p) => ({ ...p, ...patch }))}
						actions={actions}
					/>
				</Grid>
				<Grid item xs={12} md={6}>
					<FunctionParamsForm
						action={launchParams.ACTION_PARAMS?.action}
						values={functionParams}
						onChange={(patch) => setFunctionParams((p) => ({ ...p, ...patch }))}
					/>
				</Grid>
			</Grid>

			<Box sx={{ mt: 2 }}>
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
						<Button variant="contained" onClick={onSave} disabled={saving || formInvalid}>
							{saving ? 'Сохранение…' : 'Сохранить конфиг'}
						</Button>
						{formInvalid && (
							<Typography variant="body2" color="error">
								Проверьте обязательные поля и корректность значений
							</Typography>
						)}
					</Stack>
				</Paper>
			</Box>
		</Container>
	);
}
