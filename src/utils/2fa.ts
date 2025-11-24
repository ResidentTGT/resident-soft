import { createHmac } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function get2faCode(secret: string, stepSec = 30, digits = 6): string {
	if (!secret) {
		throw new Error('TOTP secret must not be empty');
	}
	if (digits <= 0 || digits > 10) {
		throw new Error('digits must be between 1 and 10');
	}
	if (stepSec <= 0) {
		throw new Error('stepSec must be > 0');
	}

	const key = base32ToBuffer(secret);

	const epoch = Math.floor(Date.now() / 1000);
	const counter = Math.floor(epoch / stepSec);

	const counterBuf = Buffer.alloc(8);
	let tmp = counter;
	for (let i = 7; i >= 0; i--) {
		counterBuf[i] = tmp & 0xff;
		tmp = tmp >>> 8; // zero-fill shift
	}

	const hmac = createHmac('sha1', key).update(counterBuf).digest();
	const offset = hmac[hmac.length - 1] & 0x0f;

	const codeInt =
		((hmac[offset] & 0x7f) << 24) |
		((hmac[offset + 1] & 0xff) << 16) |
		((hmac[offset + 2] & 0xff) << 8) |
		(hmac[offset + 3] & 0xff);

	const modulo = 10 ** digits;
	return (codeInt % modulo).toString().padStart(digits, '0');
}

function base32ToBuffer(base32: string): Buffer {
	const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
	if (!clean) {
		throw new Error('Base32 secret is empty or invalid');
	}

	let bits = '';
	for (const char of clean) {
		const val = BASE32_ALPHABET.indexOf(char);
		if (val === -1) {
			throw new Error(`Invalid base32 char: ${char}`);
		}
		bits += val.toString(2).padStart(5, '0');
	}

	const bytes: number[] = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) {
		const byte = bits.slice(i, i + 8);
		bytes.push(parseInt(byte, 2));
	}

	return Buffer.from(bytes);
}
