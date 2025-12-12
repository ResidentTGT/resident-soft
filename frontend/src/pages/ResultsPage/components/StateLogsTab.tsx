import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, Stack, CircularProgress, Alert, Button } from '@mui/material';
import { getStateLogs } from '../../../api/modules/states.api';
import RefreshIcon from '@mui/icons-material/Refresh';

export enum MessageType {
	Fatal,
	Error,
	Warn,
	Info,
	Notice,
	Debug,
	Trace,
}

interface LogEntry {
	timestamp: string;
	type: MessageType;
	message: string;
}

interface StateLogsTabProps {
	stateName: string;
	isActive: boolean; // Загружаем логи только когда вкладка активна
}

export const StateLogsTab = ({ stateName, isActive }: StateLogsTabProps) => {
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [limited, setLimited] = useState(false);
	const [totalCount, setTotalCount] = useState(0);

	const loadLogs = useCallback(async () => {
		if (!isActive) return;

		setLoading(true);
		setError(null);

		try {
			const response = await getStateLogs(stateName);
			setLogs(response.logs);
			setLimited(response.limited);
			setTotalCount(response.totalCount);
		} catch (e: any) {
			setError(e?.message || 'Не удалось загрузить логи');
		} finally {
			setLoading(false);
		}
	}, [stateName, isActive]);

	// Загружаем логи при активации вкладки
	useEffect(() => {
		if (isActive) {
			loadLogs();
		}
	}, [isActive, loadLogs]);

	return (
		<Box sx={{ px: 2, pb: 2, minHeight: '200px' }}>
			{loading ? (
				<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
					<CircularProgress />
				</Box>
			) : error ? (
				<Alert severity="error">{error}</Alert>
			) : logs.length === 0 ? (
				<Alert severity="info">Логи отсутствуют</Alert>
			) : (
				<>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
						{limited ? (
							<Alert severity="warning" sx={{ flex: 1, mb: 0 }}>
								Показано последних {logs.length} из {totalCount} логов (лимит: 1000)
							</Alert>
						) : (
							<Typography variant="subtitle2" color="text.secondary">
								Всего логов: {logs.length}
							</Typography>
						)}

						<Button
							variant="outlined"
							startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
							disabled={loading}
							onClick={loadLogs}
						>
							Обновить
						</Button>
					</Box>

					<Stack spacing={0.5}>
						{[...logs].reverse().map((log, index) => (
							<LogEntryItem key={index} log={log} />
						))}
					</Stack>
				</>
			)}
		</Box>
	);
};

interface LogEntryItemProps {
	log: LogEntry;
}

const LogEntryItem = ({ log }: LogEntryItemProps) => {
	const color = getMessageTypeColor(log.type);
	const timestamp = new Date(log.timestamp).toLocaleString('ru-RU');

	return (
		<Paper
			variant="outlined"
			sx={{
				p: 1.5,
				borderLeftWidth: 4,
				borderLeftColor: color,
			}}
		>
			<Stack direction="row" spacing={2} alignItems="flex-start">
				<Typography
					variant="body2"
					color="text.secondary"
					sx={{
						minWidth: '140px',
						fontFamily: 'monospace',
					}}
				>
					{timestamp}
				</Typography>
				<Typography
					variant="body2"
					sx={{
						flex: 1,
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						fontFamily: 'monospace',
					}}
				>
					{log.message}
				</Typography>
			</Stack>
		</Paper>
	);
};

// Helper function to get color based on MessageType
function getMessageTypeColor(type: MessageType): string {
	switch (type) {
		case MessageType.Fatal:
			return '#d32f2f'; // Red bold
		case MessageType.Error:
			return '#f44336'; // Red
		case MessageType.Warn:
			return '#ff9800'; // Orange
		case MessageType.Info:
			return '#4caf50'; // Green
		case MessageType.Notice:
			return '#9c27b0'; // Purple
		case MessageType.Debug:
			return '#00bcd4'; // Cyan
		case MessageType.Trace:
			return '#2196f3'; // Blue
		default:
			return '#757575'; // Grey
	}
}
