import { Snackbar, Alert } from '@mui/material';
import { useBackendEvents } from '../../hooks/useBackendEvents';
import { useToast } from '../../hooks/useToast';
import { TOAST_AUTO_HIDE_DURATION_MS } from '../../constants/toast';

export default function BackendEventsToast() {
	const { toast, showToast, closeToast } = useToast();

	useBackendEvents({
		run_started: (msg) => {
			showToast('success', `Задача запущена: ${msg.stateName}`);
		},
		run_finished: (msg) => {
			showToast('success', `Задача завершена: ${msg.stateName}`);
		},
		run_failed: (msg) => {
			showToast('error', `Ошибка при выполнении задачи: ${msg.stateName}`);
		},
		decrypt_error: (_msg) => {
			showToast('error', 'Ошибка расшифровки (неверный пароль)');
		},
	});

	return (
		<Snackbar
			open={toast.open}
			autoHideDuration={TOAST_AUTO_HIDE_DURATION_MS}
			onClose={closeToast}
			anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
		>
			<Alert onClose={closeToast} severity={toast.severity} variant="filled">
				{toast.message}
			</Alert>
		</Snackbar>
	);
}
