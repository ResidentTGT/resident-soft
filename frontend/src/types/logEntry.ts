import type { MessageType } from '../../../src/utils/logger';

export interface LogEntry {
	timestamp: string;
	type: MessageType;
	message: string;
}
