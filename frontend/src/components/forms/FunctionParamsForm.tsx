import { Paper, Typography, Alert, Box, IconButton, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { type ActionParams } from '../../../../src/actions';
import type { NetworkConfig } from '../../../../src/utils/network';
import type { JSX } from 'react';
import type { TokenConfig } from '../../../../src/utils/network/network';
import type { FunctionParams } from '../../../../src/utils/types/functionParams.type';
import { FORMS } from './Forms';

export interface FormCtx {
	params: Record<string, any>;
	set: (name: string, value: any) => void;
	networks: NetworkConfig[];
	tokens: TokenConfig[];
}

const getForm = (actionParams: ActionParams): ((ctx: FormCtx) => JSX.Element) | undefined => {
	return (FORMS as any)[actionParams.group]?.[actionParams.action];
};

export default function FunctionParamsForm({
	actionParams,
	functionParams,
	onChange,
	networks,
	tokens,
}: {
	actionParams: ActionParams;
	functionParams: FunctionParams;
	networks: NetworkConfig[];
	tokens: TokenConfig[];
	onChange: (next: FunctionParams) => void;
}) {
	const currentFuncParams: Record<string, any> | undefined =
		actionParams.group && actionParams.action
			? (functionParams as any)[actionParams.group]?.[actionParams.action]
			: undefined;

	const setNewParams = (name: string, value: any) => {
		const byGroup = { ...(functionParams as any)[actionParams.group] };
		const currentFuncParams: Record<string, any> = (functionParams as any)[actionParams.group][actionParams.action];
		currentFuncParams[name] = value;
		byGroup[actionParams.action] = currentFuncParams;

		const newFunctionParams = { ...functionParams, [actionParams.group]: byGroup };
		return onChange(newFunctionParams);
	};

	const Form = getForm(actionParams);

	return (
		<Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
				<Typography variant="h6">Параметры действия</Typography>
				<Tooltip title="Открыть документацию по действиям и параметрам" arrow>
					<IconButton
						href="https://resident.gitbook.io/resident-soft/spisok-deistvii-i-neobkhodimykh-dannykh"
						target="_blank"
						rel="noopener noreferrer"
					>
						<HelpOutlineIcon />
					</IconButton>
				</Tooltip>
			</Box>

			{!actionParams.group || !actionParams.action ? (
				<Alert severity="info">Выбери действие слева.</Alert>
			) : !currentFuncParams ? (
				<Alert severity="success">
					Для «{actionParams.group}.{actionParams.action}» параметры не требуются.
				</Alert>
			) : !Form ? (
				<Alert severity="warning">
					Форма для «{actionParams.group}.{actionParams.action}» пока не реализована.
				</Alert>
			) : (
				<Form params={currentFuncParams} set={setNewParams} networks={networks} tokens={tokens} />
			)}
		</Paper>
	);
}
