import { Column, SHEETS } from './account';

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
		errorStr.includes('UNKNOWN_ERROR') ||
		errorStr.includes('network error') ||
		errorStr.includes('Network error') ||
		errorStr.includes('connection error') ||
		errorStr.includes('timeout') ||
		errorStr.includes('ETIMEDOUT') ||
		errorStr.includes('ECONNREFUSED') ||
		errorStr.includes('could not coalesce error');

	const isTransient = isProxyError || isRpcError;

	return { isProxyError, isRpcError, isTransient, errorCode: typeof errorCode === 'number' ? errorCode : undefined };
}
