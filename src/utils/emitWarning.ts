export function emitWarning() {
	const orig = process.emitWarning;
	process.emitWarning = function (warning: any, ...rest: any[]) {
		let type: string | undefined;
		let code: string | undefined;

		if (rest.length === 1 && rest[0] && typeof rest[0] === 'object') {
			type = rest[0].type;
			code = rest[0].code;
		} else {
			type = typeof rest[0] === 'string' ? rest[0] : undefined;
			code = typeof rest[1] === 'string' ? rest[1] : undefined;
		}
		if (!code && warning && typeof warning === 'object') code = (warning as any).code;
		if (!type && warning && typeof warning === 'object') type = (warning as any).name;

		if (code === 'DEP0040' || code === 'DEP0169') return;
		// if (type === 'DeprecationWarning') return; // вариант: срезать все деприки

		return orig.call(process, warning, ...rest);
	};
}
