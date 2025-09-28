export type SchemaField =
	| { kind: 'number'; name: string; label: string; required?: boolean; min?: number }
	| { kind: 'string'; name: string; label: string; required?: boolean }
	| { kind: 'boolean'; name: string; label: string }
	| { kind: 'numberRange'; name: string; labelMin: string; labelMax: string; required?: boolean };

export const functionParamSchemas: Record<string, SchemaField[] | undefined> = {
	Deposit: [
		{ kind: 'number', name: 'amount', label: 'Сумма депозита', required: true, min: 0 },
		{ kind: 'string', name: 'recipient', label: 'Адрес получателя', required: true },
	],
	CheckStats: [],
};
