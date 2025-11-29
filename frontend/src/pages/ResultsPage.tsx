// frontend/src/pages/ResultsPage.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	Container,
	Paper,
	Alert,
	Stack,
	Typography,
	Button,
	Chip,
	CircularProgress,
	Tooltip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	IconButton,
	Snackbar,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Collapse,
	Box,
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { deleteState, getStates } from '../api';

import type { StandardState } from '../../../src/utils/state/standardState.interface';

// Interfaces
interface StateItem {
	data: StandardState;
	updatedAt?: string;
}

interface ToastState {
	open: boolean;
	severity: 'success' | 'error';
	message: string;
}

// Constants
const AUTO_REFRESH_INTERVAL_MS = 10000; // 10 seconds
const TOAST_AUTO_HIDE_DURATION = 5000; // 5 seconds

const formatRu = (d?: string) => (d ? new Date(d).toLocaleString('ru-RU') : '');

const formatRelativeTime = (date: Date): string => {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);

	if (diffSec < 60) return `${diffSec} секунд назад`;

	const diffMin = Math.floor(diffSec / 60);
	if (diffMin === 1) return '1 минуту назад';
	if (diffMin < 5) return `${diffMin} минуты назад`;
	if (diffMin < 60) return `${diffMin} минут назад`;

	const diffHour = Math.floor(diffMin / 60);
	if (diffHour === 1) return '1 час назад';
	if (diffHour < 5) return `${diffHour} часа назад`;
	if (diffHour < 24) return `${diffHour} часов назад`;

	return formatRu(date.toISOString());
};

const splitByLastUnderscore = (s: string) => {
	const i = s.lastIndexOf('_');
	return i === -1 ? { base: s, num: s } : { base: s.slice(0, i), num: s.slice(i + 1) };
};

const compareAccountNumbers = (a: { num: string }, b: { num: string }) => {
	const ai = Number(a.num);
	const bi = Number(b.num);
	if (!Number.isNaN(ai) && !Number.isNaN(bi)) return ai - bi;
	return a.num.localeCompare(b.num, 'ru');
};

const parseAccounts = (data: StandardState) => {
	const succ = data.successes.map(splitByLastUnderscore);
	const fail = data.fails.map(splitByLastUnderscore);

	succ.sort(compareAccountNumbers);
	fail.sort(compareAccountNumbers);

	return { succ, fail };
};

export default function ResultsPage() {
	const [map, setMap] = useState<Record<string, StateItem>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const deletingRef = useRef(false);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [toast, setToast] = useState<ToastState>({
		open: false,
		severity: 'success',
		message: '',
	});
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const [, setTick] = useState(0);

	const fetchAll = useCallback(async () => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);
		setError(null);

		try {
			const { states, failed } = await getStates(controller.signal);

			const statesMap: Record<string, StateItem> = {};
			for (const s of states) {
				statesMap[s.name] = { data: s.data, updatedAt: s.updatedAt };
			}

			setMap(statesMap);
			setLastUpdated(new Date());

			if (failed && failed.length) {
				const msg = failed.map((f) => (f.error ? `${f.name} (${f.error})` : f.name)).join(', ');
				setError(`Не удалось загрузить: ${msg}`);
			}
		} catch (e: any) {
			if (e?.name === 'AbortError') return;
			setMap({});
			setError(`Не удалось получить стейты: ${e.message ?? e}`);
		} finally {
			setLoading(false);
		}
	}, []);

	const handleDelete = useCallback(async () => {
		if (!deleteTarget) return;

		setDeleting(true);
		deletingRef.current = true;
		try {
			const fileName = `${deleteTarget}.json`;
			await deleteState(fileName);

			setDeleteTarget(null);
			setToast({
				open: true,
				severity: 'success',
				message: `Стейт "${deleteTarget}" успешно удалён`,
			});

			await fetchAll();
		} catch (e: any) {
			setToast({
				open: true,
				severity: 'error',
				message: `Не удалось удалить стейт: ${e?.message ?? e}`,
			});
		} finally {
			setDeleting(false);
			deletingRef.current = false;
		}
	}, [deleteTarget, fetchAll]);

	const closeToast = (_e?: any, reason?: string) => {
		if (reason === 'clickaway') return;
		setToast((p) => ({ ...p, open: false }));
	};

	const toggleExpand = (name: string) => {
		setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
	};

	const startAutoRefresh = useCallback(() => {
		// Clear existing interval if any
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		// Set up auto-refresh interval
		intervalRef.current = setInterval(() => {
			if (!deletingRef.current) {
				// Skip refresh during delete operations
				fetchAll();
			}
		}, AUTO_REFRESH_INTERVAL_MS);
	}, [fetchAll]);

	const handleManualRefresh = useCallback(() => {
		fetchAll();
		startAutoRefresh(); // Reset the timer
	}, [fetchAll, startAutoRefresh]);

	useEffect(() => {
		// Initial fetch
		fetchAll();

		// Start auto-refresh
		startAutoRefresh();

		// Cleanup on unmount
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [fetchAll, startAutoRefresh]);

	useEffect(() => {
		// Update displayed relative time every second
		const tickInterval = setInterval(() => {
			setTick((prev) => prev + 1);
		}, 1000);

		return () => clearInterval(tickInterval);
	}, []);

	const stateNames = Object.keys(map).sort();

	const deleteTargetData = deleteTarget ? map[deleteTarget]?.data : undefined;
	const deleteTargetSuccessCount = deleteTargetData?.successes.length ?? 0;
	const deleteTargetFailCount = deleteTargetData?.fails.length ?? 0;

	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			<Paper variant="outlined" sx={{ p: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
					<Typography variant="h6">Стейты</Typography>
					<Stack direction="row" alignItems="center" spacing={2}>
						{lastUpdated && (
							<Typography variant="caption" sx={{ opacity: 0.7 }}>
								Обновлено: {formatRelativeTime(lastUpdated)}
							</Typography>
						)}
						<Tooltip title="Обновить все стейты">
							<span>
								<Button
									variant="outlined"
									startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
									disabled={loading}
									onClick={handleManualRefresh}
								>
									Обновить
								</Button>
							</span>
						</Tooltip>
					</Stack>
				</Stack>

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				{loading && (
					<Stack alignItems="center" sx={{ py: 4 }}>
						<CircularProgress />
					</Stack>
				)}

				{!loading && stateNames.length === 0 && <Alert severity="info">Нет доступных стейтов</Alert>}

				{!loading && stateNames.length > 0 && (
					<List sx={{ width: '100%' }}>
						{stateNames.map((name) => {
							const item = map[name];
							const data = item.data;
							const successCount = data.successes.length;
							const failCount = data.fails.length;
							const isExpanded = expanded[name] ?? false;
							const { succ, fail } = parseAccounts(data);

							return (
								<Paper key={name} variant="outlined" sx={{ mb: 1.5, overflow: 'hidden' }}>
									<ListItem
										disablePadding
										secondaryAction={
											<Tooltip title="Удалить стейт">
												<IconButton
													edge="end"
													color="error"
													onClick={(e) => {
														e.stopPropagation();
														setDeleteTarget(name);
													}}
												>
													<DeleteIcon />
												</IconButton>
											</Tooltip>
										}
									>
										<ListItemButton onClick={() => toggleExpand(name)}>
											<ListItemText
												primary={
													<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
														<Typography variant="subtitle1" fontWeight="medium">
															{name}
														</Typography>
														<Chip
															label={`Успешно: ${successCount}`}
															size="small"
															color="success"
															variant="outlined"
														/>
														<Chip
															label={`Неудачно: ${failCount}`}
															size="small"
															color="error"
															variant="outlined"
														/>
														{item.updatedAt && (
															<Typography variant="caption" sx={{ opacity: 0.7 }}>
																{formatRu(item.updatedAt)}
															</Typography>
														)}
													</Stack>
												}
											/>
											{isExpanded ? <ExpandLess /> : <ExpandMore />}
										</ListItemButton>
									</ListItem>
									<Collapse in={isExpanded} timeout="auto" unmountOnExit>
										<Box sx={{ px: 2, pb: 2 }}>
											{data.info && (
												<Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
													{data.info}
												</Alert>
											)}
											<Stack spacing={2}>
												{successCount > 0 && (
													<Box>
														<Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
															Успешно ({successCount})
														</Typography>
														<Paper
															variant="outlined"
															sx={{
																p: 1.5,
																bgcolor: 'success.50',
															}}
														>
															<Typography
																variant="body2"
																sx={{ wordBreak: 'break-word', lineHeight: 1.6 }}
															>
																{succ.map(({ num }) => num).join(', ')}
															</Typography>
														</Paper>
													</Box>
												)}
												{failCount > 0 && (
													<Box>
														<Typography variant="subtitle2" color="error.main" sx={{ mb: 1 }}>
															Неудачно ({failCount})
														</Typography>
														<Paper
															variant="outlined"
															sx={{
																p: 1.5,
																bgcolor: 'error.50',
															}}
														>
															<Typography
																variant="body2"
																sx={{ wordBreak: 'break-word', lineHeight: 1.6 }}
															>
																{fail.map(({ num }) => num).join(', ')}
															</Typography>
														</Paper>
													</Box>
												)}
												{successCount === 0 && failCount === 0 && (
													<Typography variant="body2" sx={{ opacity: 0.7 }}>
														Нет данных
													</Typography>
												)}
											</Stack>
										</Box>
									</Collapse>
								</Paper>
							);
						})}
					</List>
				)}
			</Paper>

			<Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
				<DialogTitle>Удалить стейт</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Вы точно хотите удалить стейт <b>{deleteTarget || '(не выбран)'}</b>?
						<br />
						<br />
						Успешно: <b>{deleteTargetSuccessCount}</b>, Неудачно: <b>{deleteTargetFailCount}</b>
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
						Отмена
					</Button>
					<Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={toast.open}
				autoHideDuration={TOAST_AUTO_HIDE_DURATION}
				onClose={closeToast}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
					{toast.message}
				</Alert>
			</Snackbar>
		</Container>
	);
}
