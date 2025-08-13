// licenses.js
'use strict';

const jose = require('jose');

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0k9jf2Bj+hA44gkubQEi
PZ5dlF889MfA/kNpdqjXfnOmQMHEcs0aJUqOARvlh6j5HB1FKiWuQ1PvOwtJ73TY
BhbMhF5zwYKEbFXLxaPFpJqdxmmexx//2wGxmDR0n+slJur/nUtxRAJutdcjuRVe
8MdnP0vIaKOIHbQH1lPx3Gea8TLAjKi4GTpOZGyMNg0id41TcPZA6mNh95eeVDNh
ZFNQWhL6RCXnh38lKkuBDzPzhgrFFL6xjYCX9YJGT+zgrDrNTrWx6uZhZZoioOSM
rOYCq12JJkY8swYCtVXfS4nEto15FtxPSNPuk1CpgTEsfYLqum6H0l9sls+dPGj3
sQIDAQAB
-----END PUBLIC KEY-----`;

let pubKeyPromise = null;
async function getPublicKey() {
	return (pubKeyPromise ??= jose.importSPKI(PUBLIC_KEY_PEM, 'RS256'));
}

function normalizeToken(token) {
	const t = (token || '').trim();
	if (!t) return null;
	return t.startsWith('Bearer ') ? t.slice(7).trim() : t;
}

/**
 * @param {string|null|undefined} token
 * @param {{ clockToleranceSec?: number }} [opts]
 * @returns {Promise<{ ok: true, payload: any, expiresAt: Date, expiresInSec: number } | { ok: false, reason: 'no_token'|'bad_format'|'missing_exp'|'expired_or_invalid', error?: any }>}
 */
async function verifyLicense(token, opts = {}) {
	const raw = token ? normalizeToken(token) : null;
	if (!raw) return { ok: false, reason: 'no_token' };

	try {
		const pubKey = await getPublicKey();
		const { payload } = await jose.jwtVerify(raw, pubKey, {
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
			payload,
			expiresAt: new Date(payload.exp * 1000),
			expiresInSec,
		};
	} catch (err) {
		return { ok: false, reason: 'expired_or_invalid', error: err };
	}
}

module.exports = { verifyLicense };
