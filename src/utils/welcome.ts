import { LaunchParams } from './launchParams.type';
import { LicenseClaims, verifyLicense, VerifyResult } from './licenses';

export async function welcome(launchParams: LaunchParams): Promise<VerifyResult<LicenseClaims>> {
	const result = await verifyLicense(launchParams.LICENSE);
	if (result.ok)
		console.log(
			`\u001b[0;35mHi, ${result.payload.user}! Your license is valid until ${result.expiresAt.toLocaleString()}.\u001b[0m`,
		);
	else {
		if (result.reason === 'no_token') {
			console.log(`\u001b[0;35mHi, free anonymous user!\u001b[0m`);
		} else {
			console.log(`\u001b[0;31mHi! Provided license is expired or invalid. ${result.error}\u001b[0m`);
		}
	}

	return result;
}
