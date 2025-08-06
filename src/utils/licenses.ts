import { importSPKI, jwtVerify, type JWTPayload } from 'jose';

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0k9jf2Bj+hA44gkubQEi
PZ5dlF889MfA/kNpdqjXfnOmQMHEcs0aJUqOARvlh6j5HB1FKiWuQ1PvOwtJ73TY
BhbMhF5zwYKEbFXLxaPFpJqdxmmexx//2wGxmDR0n+slJur/nUtxRAJutdcjuRVe
8MdnP0vIaKOIHbQH1lPx3Gea8TLAjKi4GTpOZGyMNg0id41TcPZA6mNh95eeVDNh
ZFNQWhL6RCXnh38lKkuBDzPzhgrFFL6xjYCX9YJGT+zgrDrNTrWx6uZhZZoioOSM
rOYCq12JJkY8swYCtVXfS4nEto15FtxPSNPuk1CpgTEsfYLqum6H0l9sls+dPGj3
sQIDAQAB
-----END PUBLIC KEY-----`;

export type LicenseClaims = JWTPayload & {
	sub?: string;
	user?: string;
	exp: number;
	iss?: string;
	aud?: string;
};

export type VerifyResult<T extends LicenseClaims = LicenseClaims> =
	| { ok: true; payload: T; expiresAt: Date; expiresInSec: number }
	| { ok: false; reason: 'no_token' | 'bad_format' | 'missing_exp' | 'expired_or_invalid'; error?: unknown };

let pubKeyPromise: ReturnType<typeof importSPKI> | null = null;
async function getPublicKey() {
	return (pubKeyPromise ??= importSPKI(PUBLIC_KEY_PEM, 'RS256'));
}

export interface VerifyOptions {
	clockToleranceSec?: number; // default 30s
}

function normalizeToken(token: string): string | null {
	const t = token?.trim();
	if (!t) return null;
	return t.startsWith('Bearer ') ? t.slice(7).trim() : t;
}

export async function verifyLicense<T extends LicenseClaims = LicenseClaims>(
	token: string | null | undefined,
	opts: VerifyOptions = {},
): Promise<VerifyResult<T>> {
	const raw = token ? normalizeToken(token) : null;
	if (!raw) return { ok: false, reason: 'no_token' };

	try {
		const pubKey = await getPublicKey();
		const { payload } = await jwtVerify(raw, pubKey, {
			algorithms: ['RS256'],
			typ: 'JWT',
			clockTolerance: opts.clockToleranceSec ?? 30,
		});

		if (typeof payload.exp !== 'number') {
			return { ok: false, reason: 'missing_exp' };
		}

		const nowSec = Math.floor(Date.now() / 1000);
		const expiresInSec = payload.exp - nowSec;
		return {
			ok: true,
			payload: payload as T,
			expiresAt: new Date(payload.exp * 1000),
			expiresInSec,
		};
	} catch (err) {
		return { ok: false, reason: 'expired_or_invalid', error: err };
	}
}
