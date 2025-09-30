import { LaunchParams } from './types/launchParams.type';
import { LicenseClaims, verifyLicense, VerifyResult } from './licenses';
import { PURPLE_TEXT, RED_TEXT, RESET, YELLOW_TEXT } from './logger';

const purple = `\x1b[38;2;118;84;173m`;

export async function welcomeMessage(): Promise<void> {
	console.log(
		purple +
			`░█▀▄░█▀▀░█▀▀░▀█▀░█▀▄░█▀▀░█▀█░▀█▀░░░█▀▀░█▀█░█▀▀░▀█▀
░█▀▄░█▀▀░▀▀█░░█░░█░█░█▀▀░█░█░░█░░░░▀▀█░█░█░█▀▀░░█░
░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀░░▀▀▀░▀░▀░░▀░░░░▀▀▀░▀▀▀░▀░░░░▀░\n` +
			RESET,
	);

	console.log(YELLOW_TEXT + `🍭 ${process.env.npm_package_version}\n` + RESET);

	console.log(YELLOW_TEXT + `Documentation: https://resident.gitbook.io/resident-soft` + RESET);
	console.log(YELLOW_TEXT + `Source code: https://github.com/ResidentTGT/resident-soft\n` + RESET);
}

export async function getVerifyLicenseMessage(launchParams: LaunchParams): Promise<VerifyResult<LicenseClaims>> {
	const result = await verifyLicense(launchParams.LICENSE);
	if (result.ok)
		console.log(
			`${PURPLE_TEXT}Hi, ${result.payload.user}! Your license is valid until ${result.expiresAt.toLocaleString()}.${RESET}\n`,
		);
	else {
		if (result.reason === 'no_token') {
			console.log(`${PURPLE_TEXT}Hi, free anonymous user!${RESET}\n`);
		} else {
			console.log(`${RED_TEXT}Hi! Provided license is expired or invalid. ${result.error}${RESET}\n`);
		}
	}

	return result;
}
