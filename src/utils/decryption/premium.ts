import path from 'path';
import { decrypt } from './aesEncryption';
import extract from 'extract-zip';
import { promises } from 'fs';

async function unzipArchive(zipPath: string, outDir: string) {
	try {
		await extract(zipPath, { dir: path.resolve(outDir) });
	} catch (err) {
		throw new Error(`Error during unzip premium.zip: ${err}`);
	}
}

async function processDirectory(dir: string, transform: any) {
	const entries = await promises.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await processDirectory(fullPath, transform);
		} else if (entry.isFile()) {
			const content = await promises.readFile(fullPath, 'utf8');
			const newContent = transform(content, fullPath);
			await promises.writeFile(fullPath, newContent, 'utf8');
		}
	}
}

export async function decryptPremium(password: string) {
	try {
		const rootDir = path.resolve('.src/premium');
		const filePath = path.resolve('./premium.zip');

		await unzipArchive(filePath, rootDir);

		const func = (content: any) => decrypt(password, content);
		await processDirectory(rootDir, func);
	} catch (err) {
		throw new Error(`Error during decrypt premium.zip: ${err}`);
	}
}
