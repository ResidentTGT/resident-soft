import esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['index.ts'],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node24',
	mainFields: ['module', 'main'],
	conditions: ['node', 'default'],
	sourcemap: true,
	outfile: 'dist/index.js',
	metafile: false,
	logLevel: 'debug',
	ignoreAnnotations: true,
	minify: false,
});
