import esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

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
	define: {
		'process.env.npm_package_version': JSON.stringify(pkg.version),
	},
});
