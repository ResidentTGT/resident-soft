export function getProcessArgs() {
	const ARGS: any = {};
	process.argv.slice(2).forEach((p) => (ARGS[p.split('=')[0]] = p.split('=')[1]));
	return ARGS;
}
