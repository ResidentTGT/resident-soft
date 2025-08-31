import { LaunchParams } from './launchParams.type';
import { LicenseClaims, verifyLicense, VerifyResult } from './licenses';

export async function welcome(launchParams: LaunchParams): Promise<VerifyResult<LicenseClaims>> {
	const gold = `\x1b[38;2;253;204;5m`;
	const purple = `\x1b[38;2;118;84;168m`;
	const reset = `\u001b[0m`;
	console.log(
		purple +
			`░█▀▄░█▀▀░█▀▀░▀█▀░█▀▄░█▀▀░█▀█░▀█▀░░░█▀▀░█▀█░█▀▀░▀█▀
░█▀▄░█▀▀░▀▀█░░█░░█░█░█▀▀░█░█░░█░░░░▀▀█░█░█░█▀▀░░█░
░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀░░▀▀▀░▀░▀░░▀░░░░▀▀▀░▀▀▀░▀░░░░▀░\n` +
			reset,
	);
	console.log(gold + `Documentation: https://resident.gitbook.io/resident-soft` + reset);
	console.log(gold + `Source code: https://github.com/ResidentTGT/resident-soft\n` + reset);

	const result = await verifyLicense(launchParams.LICENSE);
	if (result.ok)
		console.log(
			`${purple}Hi, ${result.payload.user}! Your license is valid until ${result.expiresAt.toLocaleString()}.${reset}\n`,
		);
	else {
		if (result.reason === 'no_token') {
			console.log(`${purple}Hi, free anonymous user!${reset}\n`);
		} else {
			console.log(`\u001b[0;31mHi! Provided license is expired or invalid. ${result.error}${reset}\n`);
		}
	}

	return result;
}
