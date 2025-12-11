import { Column, SHEETS } from './account';
import { RED_BOLD_TEXT, RESET, YELLOW_TEXT } from './logger';

export class MissingFieldError extends Error {
	public readonly fieldName: string;
	public readonly columnName?: string;

	constructor(fieldName: string, isAccount = true) {
		const allColumns: Column[] = SHEETS.flatMap((sheet) => sheet.columns);

		if (isAccount) {
			const column = allColumns.find((col) => col.key === fieldName);
			if (!column) throw new Error(`Missing column for field: ${fieldName}`);

			super(`Missing required field in Account: "${column.header}" (${fieldName})`);
			this.columnName = column.header;
		} else {
			super(`Missing required field from SECRET_STORAGE: ${fieldName}`);
		}
		this.fieldName = fieldName;

		this.name = this.constructor.name;

		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class NetworkError extends Error {
	public readonly isProxyError: boolean;
	public readonly isRpcError: boolean;
	public readonly errorCode?: number;

	constructor(message: string, isProxyError = false, isRpcError = false, errorCode?: number) {
		super(message);
		this.name = this.constructor.name;
		this.isProxyError = isProxyError;
		this.isRpcError = isRpcError;
		this.errorCode = errorCode;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export function detectNetworkError(error: any): {
	isProxyError: boolean;
	isRpcError: boolean;
	isTransient: boolean;
	errorCode?: number;
} {
	const errorStr = error?.toString() || '';
	const errorMessage = error?.message || '';
	const errorCode = error?.code;

	const isProxyError =
		errorCode === -32064 ||
		errorStr.includes('Proxy error') ||
		errorStr.includes('proxy error') ||
		errorMessage.includes('Proxy error');

	const isRpcError =
		errorCode === 'UNKNOWN_ERROR' ||
		errorCode === 'BAD_DATA' ||
		errorCode === -32090 || // Rate limit error code
		errorCode === -32005 || // Resource not found
		errorCode === -32000 || // Server error
		errorStr.includes('UNKNOWN_ERROR') ||
		errorStr.includes('BAD_DATA') ||
		errorStr.includes('network error') ||
		errorStr.includes('Network error') ||
		errorStr.includes('connection error') ||
		errorStr.includes('timeout') ||
		errorStr.includes('ETIMEDOUT') ||
		errorStr.includes('ECONNREFUSED') ||
		errorStr.includes('could not coalesce error') ||
		errorStr.includes('Too many requests') ||
		errorStr.includes('rate limit') ||
		errorStr.includes('missing response') ||
		errorMessage.includes('Too many requests') ||
		errorMessage.includes('rate limit') ||
		errorMessage.includes('missing response');

	const isTransient = isProxyError || isRpcError;

	return { isProxyError, isRpcError, isTransient, errorCode: typeof errorCode === 'number' ? errorCode : undefined };
}

/**
 * Global unhandled rejection handler
 *
 * IMPORTANT: This is a LAST RESORT handler for errors that escaped try-catch blocks.
 * When this fires, it means:
 * 1. Background provider operations (polling, reconnection) - safe to ignore for transient errors
 * 2. Bugs in code where promises are not properly caught - should be fixed in the code
 *
 * For transient network errors:
 * - Logs as warning and continues execution
 * - This prevents app crashes from unstable RPC connections
 * - The CURRENT OPERATION that caused this error has already FAILED
 * - Handlers have their own try-catch, so this shouldn't fire during normal account processing
 *
 * For critical errors:
 * - Logs and exits the process to prevent corrupted state
 * - Calls onCriticalError callback before exiting (for cleanup like failing process states)
 */
export function setupUnhandledRejectionHandler(onCriticalError?: () => Promise<void> | void): void {
	process.on('unhandledRejection', async (error) => {
		const message = error instanceof Error ? error.message : String(error);
		const stack = error instanceof Error ? error.stack : undefined;

		// Detect if this is a transient network error (RPC/proxy issues)
		const networkError = detectNetworkError(error);

		if (networkError.isTransient) {
			// Log as warning but don't crash for transient network errors
			// These are typically from background provider operations, not the main execution flow
			console.error(`${YELLOW_TEXT}Warning: Unhandled network error (non-fatal): ${message}${RESET}`);
			console.error(
				`${YELLOW_TEXT}Note: This is likely from background RPC polling. If it persists, check your RPC endpoints.${RESET}`,
			);
			console.error(`${YELLOW_TEXT}Stack trace:${RESET}`);
			if (stack) console.error(stack);
		} else {
			// Critical error - crash the app
			console.error(`${RED_BOLD_TEXT}Unhandled exception occurred: ${message}${RESET}`);
			console.error(`${RED_BOLD_TEXT}Stack trace:${RESET}`);
			if (stack) console.error(stack);

			// Call cleanup callback before exiting
			if (onCriticalError) {
				try {
					await onCriticalError();
				} catch (cleanupError) {
					console.error(`${RED_BOLD_TEXT}Error during cleanup: ${cleanupError}${RESET}`);
				}
			}

			process.exit(1);
		}
	});
}
