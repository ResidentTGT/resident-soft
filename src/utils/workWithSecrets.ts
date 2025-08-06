import Excel, { Worksheet } from 'exceljs';
import { readFileSync, writeFileSync } from 'fs';
import { getEncryptedOrDecryptedAccounts, getEncryptedOrDecryptedSecretStorage } from '@utils/decryption';
import { SHEETS } from './account/models/csvSheets';
import { Account } from './account/models/account.type';
import { parse } from 'jsonc-parser';
import { SecretStorage } from './secretStorage.type';
import * as fs from 'fs/promises';

export async function saveJsonAccountsToCsv(filePath: string, accounts: Account[]) {
	const workbook = new Excel.Workbook();
	const fileName = filePath.split('.xlsx')[0].split('/').pop();

	//converting nested objects to flat for columns keys matching
	const flatAccounts = accounts.map((acc: any) => {
		for (const sheet of SHEETS) {
			const columns = sheet.columns;
			for (const column of columns) {
				const keys = column.key.split('.');
				acc[column.key] = keys.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), acc);
			}
		}

		acc.name = acc.name.split(`${fileName}_`)[1];
		return acc;
	});

	for (const sheet of SHEETS) {
		const worksheet = workbook.addWorksheet(sheet.name);
		sheet.columns.forEach((column) => {
			if (!column.width) column.width = 10;
		});
		worksheet.columns = sheet.columns;
		flatAccounts.forEach((acc) => {
			worksheet.addRow(acc);
		});
		worksheet.getRow(1).font = { bold: true };
	}

	await workbook.xlsx.writeFile(filePath);
}

export async function convertFromCsvToJsonAccounts(filePath: string, writeToFile = false): Promise<Account[]> {
	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(filePath);
	const fileName = filePath.split('.xlsx')[0].split('/').pop();

	let accs: Account[] = [];

	workbook.eachSheet((worksheet: Worksheet) => {
		const columns = SHEETS.find((sheet) => sheet.name === worksheet.name)?.columns;
		worksheet.eachRow((row, rowNumber) => {
			if (rowNumber === 1) return;

			const nameCell = row.getCell(1).value;
			if (nameCell === null || nameCell === undefined || nameCell.toString().trim() === '') {
				return;
			}

			const acc: any = {};
			columns?.forEach((column, columnIndex) => {
				const value = row.getCell(columnIndex + 1).value;
				if (columnIndex === 0) {
					acc[column.key] = `${fileName}_${nameCell}`;
				} else if (value !== null && value !== undefined && value.toString().trim() !== '') {
					acc[column.key] = value;
				}
			});

			const oldAcc = accs.find((a) => a.name === acc.name);
			if (!oldAcc) accs.push(acc);
			else Object.assign(oldAcc, acc);
		});
	});

	accs = accs.map((acc) => convertToNestedObject(acc));

	if (writeToFile) writeFileSync(filePath + '.json', JSON.stringify(accs));

	return accs;
}

function convertToNestedObject(flatObject: any): any {
	const nestedObject: any = {};
	Object.keys(flatObject).forEach((key) => {
		const keys = key.split('.');
		let currentLevel = nestedObject;
		keys.forEach((subKey, index) => {
			if (!(subKey in currentLevel)) {
				currentLevel[subKey] = {};
			}
			if (index === keys.length - 1) {
				currentLevel[subKey] = flatObject[key];
			}
			currentLevel = currentLevel[subKey];
		});
	});
	return nestedObject;
}

export async function convertFromCsvToCsv(
	encryptedFolderPath: string,
	decryptedFolderPath: string,
	aesKey: string,
	encrypt = true,
) {
	const files = (await fs.readdir(encrypt ? decryptedFolderPath : encryptedFolderPath)).filter((f) => f.endsWith('.xlsx'));

	for (const file of files) {
		const encryptedFilePath = `${encryptedFolderPath}/${file}`;
		const decryptedFilePath = `${decryptedFolderPath}/${file}`;

		const accs = await convertFromCsvToJsonAccounts(encrypt ? decryptedFilePath : encryptedFilePath, false);

		const newAccs = encrypt
			? getEncryptedOrDecryptedAccounts(aesKey, accs, true)
			: getEncryptedOrDecryptedAccounts(aesKey, accs, false);

		const folderPathToSave = encrypt ? encryptedFolderPath : decryptedFolderPath;

		const stat = await fs.stat(folderPathToSave).catch(() => undefined);
		if (!stat) await fs.mkdir(folderPathToSave, { recursive: true });

		await saveJsonAccountsToCsv(encrypt ? encryptedFilePath : decryptedFilePath, newAccs);

		console.log(
			`${newAccs.length} accs ${encrypt ? 'encrypted' : 'decrypted'} from ${encrypt ? decryptedFilePath : encryptedFilePath} to ${encrypt ? encryptedFilePath : decryptedFilePath}`,
		);
	}
}

export async function convertSecretStorage(encryptedFilePath: string, decryptedFilePath: string, aesKey: string, encrypt = true) {
	const secretStorage = parse(readFileSync(encrypt ? decryptedFilePath : encryptedFilePath, 'utf-8')) as SecretStorage;

	const newSecretStorage = encrypt
		? getEncryptedOrDecryptedSecretStorage(aesKey, secretStorage, true)
		: getEncryptedOrDecryptedSecretStorage(aesKey, secretStorage, false);

	const filePathToSave = encrypt ? encryptedFilePath : decryptedFilePath;
	const folderPathToSave = filePathToSave.split('/').slice(0, -1).join('/');
	const stat = await fs.stat(folderPathToSave).catch(() => undefined);
	if (!stat) await fs.mkdir(folderPathToSave, { recursive: true });

	writeFileSync(encrypt ? encryptedFilePath : decryptedFilePath, JSON.stringify(newSecretStorage));

	console.log(
		`SecretStorage ${encrypt ? 'encrypted' : 'decrypted'} from ${encrypt ? decryptedFilePath : encryptedFilePath} to ${encrypt ? encryptedFilePath : decryptedFilePath}`,
	);
}
