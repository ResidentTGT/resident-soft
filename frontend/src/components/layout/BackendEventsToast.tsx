import { Snackbar, Alert } from '@mui/material';
import { useBackendEvents } from '../../hooks/useBackendEvents';
import { useToast } from '../../hooks/useToast';
import { TOAST_AUTO_HIDE_DURATION_MS } from '../../constants/toast';

export default function BackendEventsToast() {
	const { toast, showToast, closeToast } = useToast();

	useBackendEvents({
		run_started: (msg) => {
			const name = msg.displayName || msg.stateName;
			showToast('success', `Задача запущена: ${name}`);
		},
		run_finished: (msg) => {
			const name = msg.displayName || msg.stateName;
			showToast('success', `Задача завершена: ${name}`);
		},
		run_failed: (msg) => {
			const name = msg.displayName || msg.stateName;
			showToast('error', `Ошибка при выполнении задачи: ${name}`);
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
