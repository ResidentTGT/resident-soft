import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Paper, Typography, Grid, Alert, CircularProgress, Snackbar } from '@mui/material';
import LaunchParamsForm from '../components/forms/LaunchParamsForm';
import FunctionParamsForm from '../components/forms/FunctionParamsForm';
import type { ActionsGroup } from '../../../src/actions';
import type { LaunchParams } from '../../../src/utils/types/launchParams.type';

import { getAccountsFiles, getActions, getConfigs, getNetworks, getTokens, postConfigs } from '../api/client';
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
				const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

				const [cfg, acts, ntwrks, accs, tkns] = await Promise.all([
					getConfigs(),
					getActions(),
					getNetworks(),
					getAccountsFiles(),
					getTokens(),
				]);
				setLaunchParams(cfg.launchParams);
				setFunctionParams(cfg.functionParams);

				const sortedacts = acts.slice().sort((a, b) => +a.premium - +b.premium);
				setActions(sortedacts);

				const sortedaccs = accs.slice().sort((a, b) => collator.compare(a, b));
				setAccsFiles(sortedaccs);

				const sortedntwrks = ntwrks.slice().sort((a, b) => collator.compare(a.name, b.name));
				setNetworks(sortedntwrks);

				const sortedtkns = tkns.map((entry) => {
					const tokens = Array.isArray(entry.tokens)
						? entry.tokens.slice().sort((a, b) => collator.compare(a.symbol, b.symbol))
						: entry.tokens;
					return { ...entry, tokens };
				});
				setTokens(sortedtkns);
			} catch (e) {
				console.error(e);
				alert(`Не удалось загрузить данные. ${e}.`);
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	// helpers
	const isNumberLike = (v: any) => v !== undefined && v !== null && Number.isFinite(Number(v));
	const isArrayOfNumberLike = (arr: any) => Array.isArray(arr) && arr.every(isNumberLike);

	const errors = useMemo(() => {
		const errs: string[] = [];
		const lp = launchParams;
		if (!lp) return errs;

		if (!lp.ACTION_PARAMS?.group || !lp.ACTION_PARAMS?.action) {
			errs.push('Выберите группу и действие.');
			return errs;
		}

		if (lp.TAKE_STATE === true) {
			const name = (lp as any).STATE_NAME;
			if (typeof name !== 'string' || !name.trim()) {
				errs.push('Включён TAKE_STATE — необходимо заполнить STATE_NAME (строка, не пустая).');
			}
		}

		const ja: any = lp.JOB_ACCOUNTS[0];
		if (ja) {
			if (!isNumberLike(ja.start) || !isNumberLike(ja.end)) {
				errs.push('Порядковые номера аккаунтов должны быть числами.');
			} else if (Number(ja.end) < Number(ja.start)) {
				errs.push('Порядковый номер аккаунтов "до" должен быть больше или равен "от"');
			}
			if (ja.include !== undefined && !isArrayOfNumberLike(ja.include)) {
				errs.push('"Включить только" должен быть массивом номеров аккаунтов.');
			}
			if (ja.exclude !== undefined && !isArrayOfNumberLike(ja.exclude)) {
				errs.push('"Исключить" должен быть массивом номеров аккаунтов.');
			}
		}

		const dba: any = (lp as any).DELAY_BETWEEN_ACCS_IN_S;
		if (!Array.isArray(dba) || dba.length !== 2 || !isNumberLike(dba[0]) || !isNumberLike(dba[1])) {
			errs.push('Задержка между аккаунтами должны быть числами.');
		} else if (Number(dba[1]) < Number(dba[0])) {
			errs.push('Задержка между аккаунтами: "до" должна быть больше или равна "от".');
		}

		if (!isNumberLike(lp.DELAY_AFTER_ERROR_IN_S) || Number(lp.DELAY_AFTER_ERROR_IN_S) < 0)
			errs.push(`"Задержка после ошибки" должно быть числом и >= 0.`);
		if (!isNumberLike(lp.ATTEMPTS_UNTIL_SUCCESS) || Number(lp.ATTEMPTS_UNTIL_SUCCESS) < 1)
			errs.push(`"Попыток до успеха" должно быть числом и > 0.`);
		if (!isNumberLike(lp.NUMBER_OF_THREADS) || Number(lp.NUMBER_OF_THREADS) < 1)
			errs.push(`"Количество потоков" должна быть числом и > 0.`);
		if (!isNumberLike(lp.NUMBER_OF_EXECUTIONS) || Number(lp.NUMBER_OF_EXECUTIONS) < 1)
			errs.push(`"Количество выполнений" должна быть числом и > 0.`);

		const act = actions.find((a) => a.group === lp.ACTION_PARAMS.group);
		if (act?.premium === true) {
			const license: any = (lp as any).LICENSE ?? (functionParams as any)?.LICENSE;
			if (typeof license !== 'string' || !license.trim()) {
				errs.push(`Для группы "${act.name}" обязательна валидная лицензия.`);
			}
		}

		return errs;
	}, [launchParams, functionParams]);

	const formInvalid = errors.length > 0;

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
					<Paper
						variant="outlined"
						sx={{
							p: 2,
							display: 'grid',
							gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
							columnGap: 2,
							alignItems: 'center',
							minHeight: 80,
						}}
					>
						<Box sx={{ overflow: 'hidden' }}>
							{formInvalid && (
								<Alert severity="error" variant="outlined" sx={{ width: '100%' }}>
									<Typography variant="subtitle2" sx={{ mb: 1 }}>
										Обнаружены ошибки заполнения:
									</Typography>
									<ul style={{ margin: 0, paddingInlineStart: 18 }}>
										{errors.map((msg, i) => (
											<li key={i}>
												<Typography variant="body2">{msg}</Typography>
											</li>
										))}
									</ul>
								</Alert>
							)}
						</Box>

						<Box
							sx={{
								justifySelf: { xs: 'stretch', sm: 'end' },
								alignSelf: 'center',
								display: 'flex',
								justifyContent: { xs: 'stretch', sm: 'flex-end' },
							}}
						>
							<Button
								variant="contained"
								onClick={save}
								disabled={saved === 'process' || formInvalid}
								sx={{ height: 45, px: 3 }}
							>
								Сохранить конфиг
							</Button>
						</Box>
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
