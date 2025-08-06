import { Column, SHEETS } from './account';

export class MissingFieldError extends Error {
	public readonly fieldName: string;
	public readonly columnName?: string;

	constructor(fieldName?: string, isAccount = true) {
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
