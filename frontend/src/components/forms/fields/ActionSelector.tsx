import React from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem, Box, Typography, IconButton, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { ActionsGroup } from '../../../../../src/actions';
import type { LaunchParams } from '../../../../../src/utils/types/launchParams.type';

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

	const allowedGroups = React.useMemo(() => actions.filter((g) => g.allowed), [actions]);

	const currentGroup = React.useMemo(
		() => allowedGroups.find((g) => g.group === selectedGroup),
		[allowedGroups, selectedGroup],
	);

	const allowedActionsInGroup = React.useMemo(() => (currentGroup?.actions ?? []).filter((a) => a.allowed), [currentGroup]);

	React.useEffect(() => {
		if (!selectedGroup) return;

		if (!currentGroup) {
			const g0 = allowedGroups[0];
			if (!g0) {
				if (value) onChange(undefined);
				return;
			}
			const a0 = (g0.actions || []).find((a) => a.allowed)?.action;
			const next = a0
				? { group: g0.group as any, action: a0 as any }
				: { group: g0.group as any, action: undefined as any };

			if (value?.group !== next.group || value?.action !== next.action) onChange(next);
			return;
		}

		const actionStillAllowed = allowedActionsInGroup.some((a) => a.action === selectedAction);
		if (!actionStillAllowed) {
			const a0 = allowedActionsInGroup[0]?.action;
			const next = { group: currentGroup.group as any, action: (a0 ?? undefined) as any };
			if (value?.group !== next.group || value?.action !== next.action) onChange(next);
		}
	}, [selectedGroup, selectedAction, currentGroup, allowedGroups, allowedActionsInGroup, onChange, value]);

	return (
		<>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
				<Typography variant="h6">Общие параметры</Typography>
				<Tooltip title="Открыть документацию по настройкам запуска" arrow>
					<IconButton
						href="https://resident.gitbook.io/resident-soft/nastroiki-zapuska"
						target="_blank"
						rel="noopener noreferrer"
					>
						<HelpOutlineIcon />
					</IconButton>
				</Tooltip>
			</Box>
			<Grid container spacing={2}>
				<Grid sx={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<InputLabel>Группа действий</InputLabel>
						<Select
							label="Группа действий"
							value={selectedGroup ?? ''}
							onChange={(e) => {
								const group = e.target.value as string;
								const groupObj = allowedGroups.find((g) => g.group === group);
								const firstAllowedAction = groupObj?.actions?.find((a) => a.allowed)?.action;
								onChange({
									group: group as any,
									action: (firstAllowedAction ?? undefined) as any,
								});
							}}
						>
							{allowedGroups.map((g) => (
								<MenuItem key={g.group} value={g.group}>
									{g.name || g.group} {g.premium ? '(PREMIUM)' : ''}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>

				<Grid sx={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small" disabled={!currentGroup}>
						<InputLabel>Действие</InputLabel>
						<Select
							label="Действие"
							value={selectedAction ?? ''}
							onChange={(e) => {
								const action = e.target.value as string;
								if (!currentGroup) return;
								onChange({ group: currentGroup.group as any, action: action as any });
							}}
						>
							{allowedActionsInGroup.map((a) => (
								<MenuItem key={a.action} value={a.action}>
									{a.name || a.action}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
			</Grid>
		</>
	);
}
