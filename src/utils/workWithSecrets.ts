import Excel, { Worksheet } from 'exceljs';
import { readFileSync, writeFileSync } from 'fs';
import { getEncryptedOrDecryptedAccounts, getEncryptedOrDecryptedSecretStorage } from '@utils/decryption';
import { SHEETS, type Sheet } from './account/models/csvSheets';
import { Account } from './account/models/account.type';
import { parse } from 'jsonc-parser';
import { SecretStorage } from './secretStorage.type';
import fs from 'node:fs';
import { RESET, YELLOW_TEXT } from './logger';

// Constants for Excel operations
const HEADER_ROW_INDEX = 1;
const EXCEL_COLUMN_START_INDEX = 1;
const DEFAULT_COLUMN_WIDTH = 10;
const ACCOUNT_FOLDERS = ['secrets/accounts/encrypted', 'secrets/accounts/decrypted'] as const;

export async function saveJsonAccountsToCsv(filePath: string, accounts: Account[], changeName = true) {
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

		if (changeName) acc.name = acc.name.split(`${fileName}_`)[1];
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

/**
 * Validates and fixes the structure of all account Excel files
 * Adds missing columns and removes extra columns to match SHEETS schema
 * Should be called on application startup
 */
export async function validateAndFixAccountFiles(): Promise<void> {
	let totalFilesProcessed = 0;

	for (const folderPath of ACCOUNT_FOLDERS) {
		const filesProcessed = await processAccountFolder(folderPath);
		totalFilesProcessed += filesProcessed;
	}

	if (totalFilesProcessed === 0) {
		console.log(`${YELLOW_TEXT}No account files found.\n${RESET}`);
	}
}

/**
 * Processes all Excel files in a single folder
 * @returns Number of files processed
 */
async function processAccountFolder(folderPath: string): Promise<number> {
	if (!fs.existsSync(folderPath)) {
		return 0;
	}

	const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.xlsx'));

	if (files.length === 0) {
		return 0;
	}

	for (const file of files) {
		const filePath = `${folderPath}/${file}`;
		try {
			await fixAccountFileStructure(filePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`Failed to validate/fix ${file}: ${message}`);
		}
	}

	return files.length;
}

/**
 * Fixes the structure of a single account Excel file
 * Adds missing columns and removes extra columns to match SHEETS schema
 */
async function fixAccountFileStructure(filePath: string): Promise<void> {
	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(filePath);
	let hasChanges = false;

	for (const expectedSheet of SHEETS) {
		const worksheet = workbook.getWorksheet(expectedSheet.name);

		if (!worksheet) {
			createSheetWithHeaders(workbook, expectedSheet);
			hasChanges = true;
			continue;
		}

		const actualHeaders = extractCurrentHeaders(worksheet);
		const expectedHeaders = expectedSheet.columns.map((c) => c.header);

		const structureNeedsFixing = !areHeadersMatching(actualHeaders, expectedHeaders);

		if (structureNeedsFixing) {
			fixWorksheetStructure(worksheet, expectedSheet);
			hasChanges = true;
		}
	}

	if (hasChanges) {
		await workbook.xlsx.writeFile(filePath);
	}
}

/**
 * Creates a new worksheet with proper header structure
 */
function createSheetWithHeaders(workbook: Excel.Workbook, sheetConfig: Sheet): void {
	const worksheet = workbook.addWorksheet(sheetConfig.name);
	const headerRow = worksheet.getRow(HEADER_ROW_INDEX);

	sheetConfig.columns.forEach((column, index) => {
		const columnIndex = index + EXCEL_COLUMN_START_INDEX;
		const cell = headerRow.getCell(columnIndex);
		cell.value = column.header;

		setColumnWidth(worksheet, columnIndex, column.width);
	});

	headerRow.font = { bold: true };
}

/**
 * Extracts current headers from worksheet
 * @returns Map of header name to column index
 */
function extractCurrentHeaders(worksheet: Worksheet): Map<string, number> {
	const headersMap = new Map<string, number>();
	const headerRow = worksheet.getRow(HEADER_ROW_INDEX);

	headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
		const value = cell.value;
		if (value !== null && value !== undefined) {
			const header = value.toString().trim();
			if (header) {
				headersMap.set(header, colNumber);
			}
		}
	});

	return headersMap;
}

/**
 * Checks if actual headers match expected headers
 */
function areHeadersMatching(actualHeaders: Map<string, number>, expectedHeaders: string[]): boolean {
	if (actualHeaders.size !== expectedHeaders.length) {
		return false;
	}

	return expectedHeaders.every((header) => actualHeaders.has(header));
}

/**
 * Sets column width with default fallback
 */
function setColumnWidth(worksheet: Worksheet, columnIndex: number, width?: number): void {
	const column = worksheet.getColumn(columnIndex);
	column.width = width ?? DEFAULT_COLUMN_WIDTH;
}

/**
 * Fixes worksheet structure: removes extra columns, then adds missing ones
 * Preserves all data in existing columns
 */
function fixWorksheetStructure(worksheet: Worksheet, sheetConfig: Sheet): void {
	const expectedHeaders = sheetConfig.columns.map((c) => c.header);

	removeExtraColumns(worksheet, expectedHeaders);
	addMissingColumns(worksheet, sheetConfig);
	removeColumnsWithoutHeaders(worksheet);

	const headerRow = worksheet.getRow(HEADER_ROW_INDEX);
	headerRow.font = { bold: true };
}

/**
 * Removes columns that are not in the expected headers list
 * Iterates from right to left to avoid index shifting issues
 */
function removeExtraColumns(worksheet: Worksheet, expectedHeaders: string[]): void {
	const totalColumns = worksheet.columnCount;

	for (let colNum = totalColumns; colNum >= EXCEL_COLUMN_START_INDEX; colNum--) {
		const header = getHeaderAtColumn(worksheet, colNum);

		if (header && !expectedHeaders.includes(header)) {
			worksheet.spliceColumns(colNum, 1);
		}
	}
}

/**
 * Adds missing columns at their correct positions
 * Iterates from left to right through expected headers
 */
function addMissingColumns(worksheet: Worksheet, sheetConfig: Sheet): void {
	sheetConfig.columns.forEach((column, index) => {
		const expectedPosition = index + EXCEL_COLUMN_START_INDEX;
		const currentHeader = getHeaderAtColumn(worksheet, expectedPosition);

		if (currentHeader === column.header) {
			setColumnWidth(worksheet, expectedPosition, column.width);
			return;
		}

		worksheet.spliceColumns(expectedPosition, 0, [column.header]);
		setColumnWidth(worksheet, expectedPosition, column.width);
	});
}

/**
 * Gets header value at specified column position
 */
function getHeaderAtColumn(worksheet: Worksheet, columnIndex: number): string {
	const cell = worksheet.getRow(HEADER_ROW_INDEX).getCell(columnIndex);
	return cell.value ? cell.value.toString().trim() : '';
}

/**
 * Removes all columns that have empty or missing headers
 * Iterates from right to left to avoid index shifting issues
 */
function removeColumnsWithoutHeaders(worksheet: Worksheet): void {
	const totalColumns = worksheet.columnCount;

	for (let colNum = totalColumns; colNum >= EXCEL_COLUMN_START_INDEX; colNum--) {
		const header = getHeaderAtColumn(worksheet, colNum);

		if (!header) {
			worksheet.spliceColumns(colNum, 1);
		}
	}
}

export async function convertFromCsvToJsonAccounts(filePath: string, writeToFile = false, changeName = true): Promise<Account[]> {
	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(filePath);
	const fileName = filePath.split('.xlsx')[0].split('/').pop();

	let accs: Account[] = [];

	workbook.eachSheet((worksheet: Worksheet) => {
		const columns = SHEETS.find((sheet) => sheet.name === worksheet.name)?.columns;
		if (!columns) throw new Error(`Unknown sheet "${worksheet.name}" in file: ${filePath}`);

		const headerRow = worksheet.getRow(1);
		const actualHeaders: string[] = [];
		headerRow.eachCell({ includeEmpty: false }, (cell) => {
			const v = cell.value;
			if (v !== null && v !== undefined && v.toString().trim() !== '') {
				actualHeaders.push(v.toString().trim());
			}
		});

		const expectedHeaders = columns.map((c) => c.header);
		if (actualHeaders.length !== expectedHeaders.length || expectedHeaders.join(',') !== actualHeaders.join(',')) {
			const missing = expectedHeaders.filter((h) => !actualHeaders.includes(h));
			const extra = actualHeaders.filter((h) => !expectedHeaders.includes(h));
			throw new Error(
				`File: ${filePath}, sheet "${worksheet.name}": header columns count mismatch.` +
					`\nExpected ${expectedHeaders.length}: [${expectedHeaders.join(', ')}]` +
					`\nGot ${actualHeaders.length}: [${actualHeaders.join(', ')}].` +
					(missing.length ? `\nMissing: [${missing.join(', ')}]. ` : '') +
					(extra.length ? `\nExtra: [${extra.join(', ')}].` : ''),
			);
		}

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
					acc[column.key] = changeName ? `${fileName}_${nameCell}` : nameCell;
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
	const files = fs.readdirSync(encrypt ? decryptedFolderPath : encryptedFolderPath).filter((f) => f.endsWith('.xlsx'));

	for (const file of files) {
		const encryptedFilePath = `${encryptedFolderPath}/${file}`;
		const decryptedFilePath = `${decryptedFolderPath}/${file}`;

		const accs = await convertFromCsvToJsonAccounts(encrypt ? decryptedFilePath : encryptedFilePath, false);

		const newAccs = encrypt
			? getEncryptedOrDecryptedAccounts(aesKey, accs, true)
			: getEncryptedOrDecryptedAccounts(aesKey, accs, false);

		const folderPathToSave = encrypt ? encryptedFolderPath : decryptedFolderPath;

		fs.mkdirSync(folderPathToSave, { recursive: true });

		await saveJsonAccountsToCsv(encrypt ? encryptedFilePath : decryptedFilePath, newAccs);

		console.log(
			`${newAccs.length} accs ${encrypt ? 'encrypted' : 'decrypted'} from ${encrypt ? decryptedFilePath : encryptedFilePath} to ${encrypt ? encryptedFilePath : decryptedFilePath}`,
		);
	}
}

export function convertSecretStorage(encryptedFilePath: string, decryptedFilePath: string, aesKey: string, encrypt = true) {
	const secretStorage = parse(readFileSync(encrypt ? decryptedFilePath : encryptedFilePath, 'utf-8')) as SecretStorage;

	const newSecretStorage = encrypt
		? getEncryptedOrDecryptedSecretStorage(aesKey, secretStorage, true)
		: getEncryptedOrDecryptedSecretStorage(aesKey, secretStorage, false);

	const filePathToSave = encrypt ? encryptedFilePath : decryptedFilePath;
	const folderPathToSave = filePathToSave.split('/').slice(0, -1).join('/');
	fs.mkdirSync(folderPathToSave, { recursive: true });

	writeFileSync(encrypt ? encryptedFilePath : decryptedFilePath, JSON.stringify(newSecretStorage));

	console.log(
		`SecretStorage ${encrypt ? 'encrypted' : 'decrypted'} from ${encrypt ? decryptedFilePath : encryptedFilePath} to ${encrypt ? encryptedFilePath : decryptedFilePath}`,
	);
}
