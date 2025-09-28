import React from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { ActionsGroup, LaunchParamsState } from '../../../types/config';

export default function ActionSelector({
	actions,
	value,
	onChange,
}: {
	actions: ActionsGroup[];
	value?: LaunchParamsState['ACTION_PARAMS'];
	onChange: (next?: LaunchParamsState['ACTION_PARAMS']) => void;
}) {
	const selectedGroup = value?.group ?? '';
	const selectedAction = value?.action ?? '';
	const currentGroup = actions.find((g) => g.group === selectedGroup);

	return (
		<Grid container spacing={2}>
			<Grid item xs={12} sm={6}>
				<FormControl fullWidth size="small">
					<InputLabel>Группа действия</InputLabel>
					<Select
						label="Группа действия"
						value={selectedGroup}
						onChange={(e) => {
							const group = e.target.value as string;
							const firstAction = actions.find((g) => g.group === group)?.actions?.[0]?.action;
							onChange(group ? { group, action: firstAction ?? '' } : undefined);
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
			<Grid item xs={12} sm={6}>
				<FormControl fullWidth size="small" disabled={!selectedGroup}>
					<InputLabel>Действие</InputLabel>
					<Select
						label="Действие"
						value={selectedAction}
						onChange={(e) => {
							const action = e.target.value as string;
							const group = selectedGroup;
							onChange(group ? { group, action } : undefined);
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
