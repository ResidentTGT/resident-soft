import React from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { ActionsGroup } from '../../../../../src/actions';
import type { LaunchParams } from '../../../../../src/utils/launchParams.type';

export default function ActionSelector({
	actions,
	value,
	onChange,
}: {
	actions: ActionsGroup[];
	value?: LaunchParams['ACTION_PARAMS'];
	onChange: (next?: LaunchParams['ACTION_PARAMS']) => void;
}) {
	const selectedGroup = value?.group;
	const selectedAction = value?.action;
	const currentGroup = actions.find((g) => g.group === selectedGroup);

	return (
		<Grid container spacing={2}>
			<Grid sx={{ xs: 12, sm: 6 }}>
				<FormControl fullWidth size="small">
					<InputLabel>Группа действий</InputLabel>
					<Select
						label="Группа действий"
						value={selectedGroup}
						onChange={(e) => {
							const group = e.target.value as string;
							const firstAction = actions.find((g) => g.group === group)?.actions?.[0]?.action;
							onChange({ group: group as any, action: firstAction as any });
						}}
					>
						{actions.map((g) => (
							<MenuItem key={g.group} value={g.group}>
								{g.group} {g.premium ? ' (Premium)' : ''}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Grid>
			<Grid sx={{ xs: 12, sm: 6 }}>
				<FormControl fullWidth size="small" disabled={!selectedGroup}>
					<InputLabel>Действие</InputLabel>
					<Select
						label="Действие"
						value={selectedAction}
						onChange={(e) => {
							const action = e.target.value as string;
							const group = selectedGroup;
							onChange({ group: group as any, action: action as any });
						}}
					>
						{(currentGroup?.actions ?? []).map((a) => (
							<MenuItem key={a.action} value={a.action}>
								{a.action}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Grid>
		</Grid>
	);
}
