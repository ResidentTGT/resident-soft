import type { StandardState } from '../../../../src/utils/state/standardState.interface';

// Timing constants
export const AUTO_REFRESH_INTERVAL_MS = 10000; // 10 seconds
export const RELATIVE_TIME_UPDATE_INTERVAL_MS = 1000; // 1 second

// Special values
export const BULK_DELETE_TARGET = '__BULK__';

// Interfaces
export interface StateItem {
	data: StandardState;
	updatedAt?: string;
}

export type StateDetailTab = 'settings' | 'results' | 'logs';
