export const TOAST_AUTO_HIDE_DURATION_MS = 5000; // 5 seconds

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface ToastState {
	open: boolean;
	severity: ToastSeverity;
	message: string;
}
