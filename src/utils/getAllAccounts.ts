import * as fs from 'fs/promises';
import { Account } from '@utils/account';
import { convertFromCsvToJsonAccounts } from '@utils/workWithSecrets';
import { Logger } from './logger';

export const getAllAccounts = async (folderPath: string, fileNames: string[]) => {
	try {
		await fs.access(folderPath);
	} catch (error) {
		await Logger.getInstance().log(`Directory not found: ${folderPath}. Returning empty accounts list.\n`);
		return [];
	}

	const files = await fs.readdir(folderPath);
	const filteredFiles = files.filter((f) => f.endsWith('.xlsx')).filter((f) => fileNames.map((ff) => ff + '.xlsx').includes(f));

	await Logger.getInstance().log(`Files with accounts: ${filteredFiles.join(', ')}`);

	const accs: Account[] = [];
	for (const file of filteredFiles) {
		accs.push(...(await convertFromCsvToJsonAccounts(`${folderPath}/${file}`)));
	}
	await Logger.getInstance().log(`Total accounts in files: ${accs.length}\n`);
	return accs;
};
