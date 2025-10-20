import fs from 'fs';
import path from 'path';
import { parse } from 'jsonc-parser';
import { LaunchParams } from '@utils/types/launchParams.type';

const ROOT = process.cwd(); // рядом с exe/запуском
const LAUNCH = path.join(ROOT, 'launchParams.jsonc');
const FUNCP = path.join(ROOT, 'functionParams.jsonc');

export function readJsonc(file: string) {
	const raw = fs.readFileSync(file, 'utf8');
	return parse(raw);
}

export function readConfigs(): { launchParams: LaunchParams; functionParams: any } {
	const launchParams = fs.existsSync(LAUNCH) ? readJsonc(LAUNCH) : {};
	const functionParams = fs.existsSync(FUNCP) ? readJsonc(FUNCP) : {};
	return { launchParams, functionParams };
}

export function writeConfigs(launchParams: any, functionParams: any) {
	// Комментарии в .jsonc при записи пропадут — это нормально для MVP
	fs.writeFileSync(LAUNCH, JSON.stringify(launchParams, null, '\t'.repeat(1)));
	fs.writeFileSync(FUNCP, JSON.stringify(functionParams, null, '\t'.repeat(1)));
}
