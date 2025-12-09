import { useState, useCallback } from 'react';
import type { ToastState, ToastSeverity } from '../constants';

export const useToast = () => {
	const [toast, setToast] = useState<ToastState>({
		open: false,
		severity: 'success',
		message: '',
	});

	const showToast = useCallback((severity: ToastSeverity, message: string) => {
		setToast({ open: true, severity, message });
	}, []);

	const closeToast = useCallback((_e?: any, reason?: string) => {
		if (reason === 'clickaway') return;
		setToast((prev) => ({ ...prev, open: false }));
	}, []);

	return { toast, showToast, closeToast };
};
