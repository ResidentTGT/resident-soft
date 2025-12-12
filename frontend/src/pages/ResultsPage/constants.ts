import type { StandardState } from '../../../../src/utils/state/standardState.interface';

// Timing constants
export const AUTO_REFRESH_INTERVAL_MS = 10000; // 10 seconds
export const TOAST_AUTO_HIDE_DURATION_MS = 5000; // 5 seconds
export const RELATIVE_TIME_UPDATE_INTERVAL_MS = 1000; // 1 second

// Special values
export const BULK_DELETE_TARGET = '__BULK__';

// Interfaces
export interface StateItem {
	data: StandardState;
	updatedAt?: string;
}

export type ToastSeverity = 'success' | 'error' | 'warning';

export interface ToastState {
	open: boolean;
	severity: ToastSeverity;
	message: string;
}

export type StateDetailTab = 'settings' | 'results' | 'logs';
