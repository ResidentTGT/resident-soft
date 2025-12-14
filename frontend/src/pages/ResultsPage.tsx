import { useEffect, useState, useMemo } from 'react';
import {
	Container,
	Paper,
	Alert,
	Stack,
	Typography,
	Button,
	CircularProgress,
	Tooltip,
	Snackbar,
	List,
	Checkbox,
	FormControlLabel,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useStates, useStateSelection, useStateDeletion } from './ResultsPage/hooks';
import { useToast } from '../hooks/useToast';
import { StateListItem, DeleteConfirmDialog, StatesToolbar } from './ResultsPage/components';
import { formatRelativeTime } from './ResultsPage/utils';
import {
	BULK_DELETE_TARGET,
	RELATIVE_TIME_UPDATE_INTERVAL_MS,
	AUTO_REFRESH_INTERVAL_MS,
} from './ResultsPage/constants';
import { TOAST_AUTO_HIDE_DURATION_MS } from '../constants/toast';

export default function ResultsPage() {
	const { statesMap, loading, error, lastUpdated, refreshManually } = useStates();
	const { selectedStates, selectAll, deselectAll, toggleSelection } = useStateSelection();
	const { toast, showToast, closeToast } = useToast();

	const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
	const [autoRefreshKey, setAutoRefreshKey] = useState(0);

	// Deletion management
	const { deleteTarget, deleting, confirmDelete, cancelDelete, initiateDelete } = useStateDeletion({
		onSuccess: () => {
			showToast('success', `Успешно удалено стейтов: ${selectedStates.size}`);
			deselectAll();
		},
		onError: (message) => {
			showToast('error', message);
		},
		onPartialSuccess: (succeeded, failed) => {
			showToast('warning', `Удалено: ${succeeded}, Ошибки: ${failed}`);
			deselectAll();
		},
		onComplete: refreshManually,
	});

	const [, setTick] = useState(0);
	useEffect(() => {
		const tickInterval = setInterval(() => {
			setTick((prev) => prev + 1);
		}, RELATIVE_TIME_UPDATE_INTERVAL_MS);

		return () => clearInterval(tickInterval);
	}, []);

	useEffect(() => {
		if (!autoRefreshEnabled) return;

		const interval = setInterval(() => {
			refreshManually();
		}, AUTO_REFRESH_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [autoRefreshEnabled, autoRefreshKey, refreshManually]);

	// Computed values
	const stateNames = useMemo(() => Object.keys(statesMap).sort(), [statesMap]);

	// Handlers
	const handleSelectAll = () => selectAll(stateNames);
	const handleDeleteSelected = () => initiateDelete(BULK_DELETE_TARGET);
	const handleConfirmDelete = async () => {
		await confirmDelete(selectedStates);
	};
	const handleManualRefresh = () => {
		refreshManually();
		setAutoRefreshKey((prev) => prev + 1);
	};

	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			<Paper variant="outlined" sx={{ p: 3 }}>
				{/* Header */}
				<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
					<Typography variant="h6">Стейты</Typography>
					<Stack direction="row" alignItems="center" spacing={2}>
						{lastUpdated && (
							<Typography variant="caption" sx={{ opacity: 0.7 }}>
								Обновлено: {formatRelativeTime(lastUpdated)}
							</Typography>
						)}
						<Tooltip title="Автоматическое обновление стейтов каждые 10 секунд">
							<FormControlLabel
								control={
									<Checkbox
										checked={autoRefreshEnabled}
										onChange={(e) => {
											const enabled = e.target.checked;
											setAutoRefreshEnabled(enabled);
											if (enabled) {
												handleManualRefresh();
											}
										}}
										color="primary"
									/>
								}
								label={
									<Typography variant="body2" sx={{ userSelect: 'none' }}>
										Автообновление
									</Typography>
								}
								sx={{ m: 0 }}
							/>
						</Tooltip>
						<Tooltip title="Обновить все стейты">
							<span>
								<Button
									variant="outlined"
									startIcon={<RefreshIcon />}
									disabled={loading}
									onClick={handleManualRefresh}
								>
									Обновить
								</Button>
							</span>
						</Tooltip>
					</Stack>
				</Stack>

				{/* Toolbar */}
				{stateNames.length > 0 && (
					<StatesToolbar
						selectedCount={selectedStates.size}
						loading={loading}
						deleting={deleting}
						onSelectAll={handleSelectAll}
						onDeselectAll={deselectAll}
						onDeleteSelected={handleDeleteSelected}
					/>
				)}

				{/* Error Alert */}
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				{/* Loading */}
				{loading && (
					<Stack alignItems="center" sx={{ py: 4 }}>
						<CircularProgress />
					</Stack>
				)}

				{/* Empty State */}
				{!loading && stateNames.length === 0 && <Alert severity="info">Нет доступных стейтов</Alert>}

				{/* States List */}
				{!loading && stateNames.length > 0 && (
					<List sx={{ width: '100%' }}>
						{stateNames.map((name) => (
							<StateListItem
								key={name}
								name={name}
								item={statesMap[name]}
								isSelected={selectedStates.has(name)}
								onToggleSelect={toggleSelection}
							/>
						))}
					</List>
				)}
			</Paper>

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				deleteTarget={deleteTarget}
				selectedStates={selectedStates}
				statesMap={statesMap}
				deleting={deleting}
				onConfirm={handleConfirmDelete}
				onCancel={cancelDelete}
			/>

			{/* Toast Notification */}
			<Snackbar
				open={toast.open}
				autoHideDuration={TOAST_AUTO_HIDE_DURATION_MS}
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
