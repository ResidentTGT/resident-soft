import React from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { HotTable } from '@handsontable/react-wrapper';
import type Handsontable from 'handsontable/base';
import type { Events } from 'handsontable/base';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import { registerAllModules } from 'handsontable/registry';
registerAllModules();
import { type Column as SheetColumn, SHEETS } from '../../../../src/utils/account/models/csvSheets';
import type { Account } from '../../../../src/utils/account/models/account.type';

type RowObj = Record<string, any>;

export interface AccountsHotTableProps {
	value: Account[];
	onChange: (next: Account[]) => void;
	readOnly: boolean;
}

function getByPath(obj: RowObj, path: string) {
	if (!obj || !path) return undefined;
	return path.split('.').reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

function setByPath(obj: RowObj, path: string, value: any) {
	if (!obj || !path) return;
	const keys = path.split('.');
	let cur: RowObj = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];
		if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
		cur = cur[k];
	}
	cur[keys[keys.length - 1]] = value;
}

function deepClone<T>(v: T): T {
	return v == null ? v : JSON.parse(JSON.stringify(v));
}

export default function AccountsHotTable({ value, onChange, readOnly }: AccountsHotTableProps) {
	const sheetNames = React.useMemo(() => SHEETS.map((s) => s.name), []);

	const [activeSheet, setActiveSheet] = React.useState<string>(sheetNames[0]);

	const sheetCols: SheetColumn[] = React.useMemo(() => {
		const sheet = SHEETS.find((s) => s.name === activeSheet);
		return sheet?.columns ?? [];
	}, [activeSheet]);

	const colHeaders = React.useMemo(() => sheetCols.map((c) => c.header || c.key), [sheetCols]);

	const [rows, setRows] = React.useState<Account[]>(() => deepClone(value));

	React.useEffect(() => {
		setRows(deepClone(value));
	}, [value]);

	const hotColumns: Handsontable.ColumnSettings[] = React.useMemo(() => {
		return sheetCols.map((col) => {
			const colDef: Handsontable.ColumnSettings = {
				data(rowData: RowObj, nextValue?: any) {
					if (typeof nextValue === 'undefined') {
						return getByPath(rowData, col.key);
					} else {
						setByPath(rowData, col.key, nextValue);
					}
				},
				readOnly: !!readOnly,
				wordWrap: false,
				className: 'htLeft',
			};

			return colDef;
		});
	}, [sheetCols, readOnly]);

	// события
	const handleAfterChange: Events['afterChange'] = (changes, source) => {
		if (!changes || source === 'loadData') return;
		const next = deepClone(rows);
		onChange(next);
	};

	const handleAfterCreateRow: Events['afterCreateRow'] = (index, amount) => {
		const next = deepClone(rows);
		for (let i = 0; i < amount; i++) next.splice(index, 0, {} as Account);
		setRows(next);
		onChange(deepClone(next));
	};

	const handleAfterRemoveRow: Events['afterRemoveRow'] = (index, amount) => {
		const next = deepClone(rows);
		next.splice(index, amount);
		setRows(next);
		onChange(deepClone(next));
	};

	const handleSheetChange = (e: SelectChangeEvent<string>) => {
		setActiveSheet(e.target.value);
	};

	return (
		<Box sx={{ display: 'grid', gap: 1.5, position: 'relative' }}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
				<FormControl size="small" sx={{ minWidth: 220 }}>
					<InputLabel id="sheet-label">Лист</InputLabel>
					<Select labelId="sheet-label" label="Лист" value={activeSheet} onChange={handleSheetChange}>
						{sheetNames.map((name) => (
							<MenuItem key={name} value={name}>
								{name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>

			<HotTable
				autoColumnSize={{ useHeaders: true }}
				themeName="ht-theme-main-dark"
				data={rows}
				columns={hotColumns}
				colHeaders={colHeaders}
				rowHeaders
				licenseKey="non-commercial-and-evaluation"
				readOnly={readOnly}
				manualColumnResize
				contextMenu={!readOnly}
				dropdownMenu={false}
				afterChange={handleAfterChange}
				afterCreateRow={readOnly ? undefined : handleAfterCreateRow}
				afterRemoveRow={readOnly ? undefined : handleAfterRemoveRow}
				minSpareRows={readOnly ? 0 : 1}
				height={'calc(100vh - 365px)'}
				headerClassName="htLeft"
			/>
		</Box>
	);
}
