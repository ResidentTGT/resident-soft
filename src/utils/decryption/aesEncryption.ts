import { createCipheriv, createDecipheriv, createHmac, randomBytes, ScryptOptions, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT_LEN = 16;
const SCRYPT_OPTS: ScryptOptions = { N: 1 << 14, r: 8, p: 1 };

const masterCache = new Map<string, Buffer>();
function getMaster(pass: string) {
	let mk = masterCache.get(pass);
	if (!mk) {
		const staticSalt = Buffer.from('any_salt_for_master_key', 'utf8');
		mk = scryptSync(pass, staticSalt, 32, SCRYPT_OPTS) as Buffer;
		masterCache.set(pass, mk);
	}
	return mk;
}
function hkdf(master: Buffer, salt: Buffer) {
	return createHmac('sha256', master).update(salt).digest().subarray(0, 32);
}

export function encrypt(passphrase: string, plaintext: string) {
	const salt = randomBytes(SALT_LEN);
	const key = hkdf(getMaster(passphrase), salt);

	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();

	const encrypted = Buffer.concat([salt, iv, tag, ct]).toString('base64');

	return encrypted;
}

export function decrypt(passphrase: string, b64: string) {
	const raw = Buffer.from(b64, 'base64');
	if (raw.length < SALT_LEN + IV_LEN + TAG_LEN) throw new Error('Invalid string for decryption!');
	const salt = raw.subarray(0, SALT_LEN);
	const iv = raw.subarray(SALT_LEN, SALT_LEN + IV_LEN);
	const tag = raw.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
	const ct = raw.subarray(SALT_LEN + IV_LEN + TAG_LEN);

	const key = hkdf(getMaster(passphrase), salt);
	const decipher = createDecipheriv(ALGO, key, iv);
	decipher.setAuthTag(tag);
	try {
		return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
	} catch (e) {
		throw new Error(`Couldnt decrypt. Maybe, invalid key? (${e})`);
	}
}
