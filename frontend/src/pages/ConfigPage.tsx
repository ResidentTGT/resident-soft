import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Paper, Stack, Typography, Grid, Alert, CircularProgress, Snackbar } from '@mui/material';
import LaunchParamsForm from '../components/forms/LaunchParamsForm';
import FunctionParamsForm from '../components/forms/FunctionParamsForm';
import type { ActionsGroup } from '../../../src/actions';
import type { LaunchParams } from '../../../src/utils/types/launchParams.type';

import { getAccountsFiles, getActions, getConfigs, getNetworks, getTokens, postConfigs } from '../api/client';
import { functionParamSchemas } from '../services/functionParamSchemas';
import type { NetworkConfig } from '../../../src/utils/network';
import type { TokenConfig } from '../../../src/utils/network/network';

export default function ConfigPage() {
	const [launchParams, setLaunchParams] = useState<LaunchParams>();
	const [functionParams, setFunctionParams] = useState<Record<string, any>>({});
	const [actions, setActions] = useState<ActionsGroup[]>([]);
	const [networks, setNetworks] = useState<NetworkConfig[]>([]);
	const [tokens, setTokens] = useState<TokenConfig[]>([]);
	const [accsFiles, setAccsFiles] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [saved, setSaved] = useState<'idle' | 'process'>('idle');
	const [toast, setToast] = useState<{
		open: boolean;
		severity: 'success' | 'error' | 'info';
		message: string;
	}>({ open: false, severity: 'success', message: '' });

	const handleToastClose = () => setToast((t) => ({ ...t, open: false }));

	useEffect(() => {
		(async () => {
			try {
				const [cfg, acts, ntwrks, accs, tkns] = await Promise.all([
					getConfigs(),
					getActions(),
					getNetworks(),
					getAccountsFiles(),
					getTokens(),
				]);
				setLaunchParams(cfg.launchParams);
				setFunctionParams(cfg.functionParams);
				setActions(acts);
				setAccsFiles(accs);
				setNetworks(ntwrks);
				setTokens(tkns);
			} catch (e) {
				console.error(e);
				alert(`Не удалось загрузить данные. ${e}.`);
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const formInvalid = useMemo(() => {
		const ap = launchParams?.ACTION_PARAMS;
		if (!ap || !ap.group || !ap.action) return true;

		const nums: [any, number][] = [
			[launchParams.NUMBER_OF_THREADS, 1],
			[launchParams.NUMBER_OF_EXECUTIONS, 1],
			[launchParams.ATTEMPTS_UNTIL_SUCCESS, 1],
			[launchParams.DELAY_AFTER_ERROR_IN_S, 0],
		];
		for (const [v, min] of nums) {
			if (v !== undefined && (Number.isNaN(Number(v)) || Number(v) < min)) return true;
		}

		if (launchParams.DELAY_BETWEEN_ACCS_IN_S) {
			const ok =
				Array.isArray(launchParams.DELAY_BETWEEN_ACCS_IN_S) &&
				launchParams.DELAY_BETWEEN_ACCS_IN_S.every((n: any) => typeof n === 'number' && n >= 0);
			if (!ok) return true;
		}

		const schema = launchParams.ACTION_PARAMS?.action && functionParamSchemas[launchParams.ACTION_PARAMS.action];
		if (schema && schema.length) {
			for (const fld of schema) {
				if (fld.kind === 'number' && fld.required) {
					const v = functionParams[fld.name];
					if (v === undefined || Number.isNaN(Number(v)) || (fld.min ?? -Infinity) > Number(v)) return true;
				}
				if (fld.kind === 'string' && fld.required) {
					const v = (functionParams[fld.name] ?? '').toString();
					if (!v) return true;
				}
				if (fld.kind === 'numberRange' && fld.required) {
					const v = functionParams[fld.name] as [number, number] | undefined;
					if (!v || v[0] === undefined || v[1] === undefined) return true;
				}
			}
		}

		return false;
	}, [launchParams, functionParams]);

	async function save() {
		if (formInvalid || !launchParams) return;
		setSaved('process');
		try {
			await postConfigs({ launchParams, functionParams });
			setToast({ open: true, severity: 'success', message: 'Сохранено 👍' });
		} catch (e: any) {
			setToast({ open: true, severity: 'error', message: `Ошибка сохранения: ${e?.message}` });
		} finally {
			setSaved('idle');
		}
	}
	if (loading) return <CircularProgress />;

	if (!launchParams) return <div>Не удалось загрузить данные. Проверьте бэкенд.</div>;

	return (
		<>
			<Container maxWidth="lg" sx={{ py: 2 }}>
				<Grid container spacing={2} sx={{ mt: 0, alignItems: 'stretch' }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<LaunchParamsForm
							launchParams={launchParams}
							onChange={(patch) => setLaunchParams((p) => ({ ...p, ...patch }) as any)}
							actions={actions}
							accountsFiles={accsFiles}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<FunctionParamsForm
							actionParams={launchParams.ACTION_PARAMS}
							functionParams={functionParams}
							onChange={(patch) => setFunctionParams((p) => ({ ...p, ...patch }))}
							networks={networks}
							tokens={tokens}
						/>
					</Grid>
				</Grid>

				<Box sx={{ mt: 2 }}>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
							<Button variant="contained" onClick={save} disabled={saved === 'process' || formInvalid}>
								Сохранить конфиг
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
			<Snackbar
				open={toast.open}
				autoHideDuration={5000}
				onClose={handleToastClose}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert onClose={handleToastClose} severity={toast.severity} variant="filled">
					{toast.message}
				</Alert>
			</Snackbar>
		</>
	);
}
