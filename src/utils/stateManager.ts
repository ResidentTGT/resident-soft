import { AsyncLocalStorage } from 'async_hooks';
import { broadcast } from './server/sse';
import { MessageType } from './logger';

// State context storage
const stateStore = new AsyncLocalStorage<string>();

/**
 * Get current state name from AsyncLocalStorage context
 * @returns State name if within state context, undefined otherwise
 */
export function getCurrentStateName(): string | undefined {
	return stateStore.getStore();
}

/**
 * Execute a function within a state context
 * @param name - State name to set in context
 * @param fn - Async function to execute
 * @returns Promise resolving to function result
 */
export async function withStateContext<T>(name: string, fn: () => Promise<T>): Promise<T> {
	return stateStore.run(name, fn);
}

/**
 * Broadcast run_started event with current state name and displayName
 */
export function broadcastStartState(group: string, action: string, displayName?: string): void {
	const stateName = getCurrentStateName();

	broadcast({
		eventName: 'run_started',
		stateName,
		displayName,
		type: MessageType.Notice,
		payload: { group, action },
	});
}

/**
 * Broadcast run_finished event with current state name and displayName
 */
export function broadcastFinishState(group: string, action: string, displayName?: string): void {
	const stateName = getCurrentStateName();

	broadcast({
		eventName: 'run_finished',
		stateName: stateName,
		displayName,
		type: MessageType.Notice,
		payload: { group, action },
	});
}

/**
 * Broadcast run_failed event with current state name
 */
export function broadcastFailState(
	message: string,
	eventName: 'run_failed' | 'decrypt_error' = 'run_failed',
	displayName?: string,
): void {
	const stateName = getCurrentStateName();

	broadcast({
		eventName: eventName,
		displayName,
		stateName: stateName,
		type: MessageType.Error,
		payload: { message },
	});
}
