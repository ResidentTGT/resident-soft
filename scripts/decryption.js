const { createCipheriv, createDecipheriv, createHmac, randomBytes, ScryptOptions, scryptSync } = require('crypto');

const path = require('path');
const fs = require('fs');
const promises = require('fs/promises');
const archiver = require('archiver');
const extract = require('extract-zip');
const { parse } = require('jsonc-parser');
const { verifyLicense } = require('./licenses');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT_LEN = 16;
const SCRYPT_OPTS = { N: 1 << 14, r: 8, p: 1 };

const masterCache = new Map();
function getMaster(pass) {
	let mk = masterCache.get(pass);
	if (!mk) {
		const staticSalt = Buffer.from('any_salt_for_master_key', 'utf8');
		mk = scryptSync(pass, staticSalt, 32, SCRYPT_OPTS);
		masterCache.set(pass, mk);
	}
	return mk;
}
function hkdf(master, salt) {
	return createHmac('sha256', master).update(salt).digest().subarray(0, 32);
}

function encrypt(passphrase, plaintext) {
	const salt = randomBytes(SALT_LEN);
	const key = hkdf(getMaster(passphrase), salt);

	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();

	const encrypted = Buffer.concat([salt, iv, tag, ct]).toString('base64');

	return encrypted;
}

function decrypt(passphrase, b64) {
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

async function zipDirectory(sourceDir, outPath) {
	const output = fs.createWriteStream(outPath);
	const archive = archiver('zip', { zlib: { level: 9 } });

	archive.on('error', (err) => {
		throw err;
	});
	output.on('close', () => {
		console.log(`Archive created: ${outPath} (${archive.pointer()} байт)`);
	});

	archive.pipe(output);
	archive.directory(sourceDir, false);

	await archive.finalize();
}

async function unzipArchive(zipPath, outDir) {
	try {
		await extract(zipPath, { dir: path.resolve(outDir) });
		console.log(`✅ Unzipped ${zipPath} → ${outDir}`);
	} catch (err) {
		console.error(`❌ Error during unzip:`, err);
	}
}

async function removeDirectory(dirPath) {
	try {
		await promises.rm(dirPath, { recursive: true, force: true });
		console.log(`✅ Premium folder removed: ${dirPath}`);
	} catch (err) {
		console.error(`❌ Couldnt find premium directory ${dirPath}:`, err);
	}
}

async function processDirectory(dir, transform) {
	const entries = await promises.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await processDirectory(fullPath, transform);
		} else if (entry.isFile()) {
			const content = await promises.readFile(fullPath, 'utf8');
			const newContent = transform(content, fullPath);
			await promises.writeFile(fullPath, newContent, 'utf8');
			console.log(`✔️ ${fullPath} processed.`);
		}
	}
}

async function readLicense(filePath = 'launchParams.jsonc') {
	const text = await promises.readFile(filePath, 'utf8');
	const data = parse(text);
	return data.LICENSE;
}

(async () => {
	try {
		const params = Object.fromEntries(
			process.argv.slice(2).map((arg) => {
				const [key, value] = arg.split('=');
				return [key, value];
			}),
		);

		const licenseStr = params.license ?? (await readLicense());

		const license = await verifyLicense(licenseStr);
		const isEncryption = params.encryption === 'true';

		if (license.ok) {
			console.log('License is ok.');

			const rootDir = path.resolve(params.folderPath);
			const filePath = path.resolve(params.filePath);
			console.log(`${isEncryption ? 'Encrypting' : 'Decrypting'} ${rootDir} ...`);

			if (!isEncryption) await unzipArchive(filePath, rootDir);

			const func = isEncryption
				? (content) => encrypt(license.payload.password, content)
				: (content) => decrypt(license.payload.password, content);
			await processDirectory(rootDir, func);
			console.log(`✅  All files ${isEncryption ? 'encrypted' : 'decrypted'}.`);
			if (isEncryption) {
				await zipDirectory(rootDir, filePath);
				await removeDirectory(rootDir);
			} else {
				await removeDirectory(filePath);
			}
		} else {
			console.log('No license or invalid.');
		}
	} catch (err) {
		console.error('❌  Error:', err);
	}
})();
