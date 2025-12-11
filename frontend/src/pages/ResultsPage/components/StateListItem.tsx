import { useState, useMemo } from 'react';
import {
	Paper,
	ListItem,
	ListItemButton,
	ListItemText,
	Checkbox,
	Chip,
	Stack,
	Typography,
	Collapse,
	Box,
	CircularProgress,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import type { StateItem } from '../constants';
import { formatRussianDate } from '../utils';
import { StateDetails } from './StateDetails';
import { StandardStateStatus } from '../../../../../src/utils/state/standardState.interface';

interface StateListItemProps {
	name: string;
	item: StateItem;
	isSelected: boolean;
	onToggleSelect: (name: string) => void;
}

export const StateListItem = ({ name, item, isSelected, onToggleSelect }: StateListItemProps) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const successCount = useMemo(() => item.data.successes.length, [item.data.successes]);
	const failCount = useMemo(() => item.data.fails.length, [item.data.fails]);

	const toggleExpand = () => {
		setIsExpanded((prev) => !prev);
	};

	const renderStatusIcon = () => {
		switch (item.data.status) {
			case StandardStateStatus.Finish:
				return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />;
			case StandardStateStatus.Fail:
				return <CancelIcon sx={{ color: 'error.main', fontSize: 24 }} />;
			case StandardStateStatus.Process:
				return <CircularProgress size={22} sx={{ color: 'info.main' }} />;
			default:
				return null;
		}
	};

	return (
		<Paper
			variant="outlined"
			sx={{
				mb: 1.5,
				overflow: 'hidden',
				'&:hover': {
					bgcolor: 'action.hover',
				},
			}}
		>
			<ListItem disablePadding>
				<Checkbox
					checked={isSelected}
					onChange={() => onToggleSelect(name)}
					onClick={(e) => e.stopPropagation()}
					size="medium"
					sx={{ ml: 1, my: 1, mr: 0.5 }}
				/>
				<Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5 }}>{renderStatusIcon()}</Box>
				<ListItemButton
					onClick={toggleExpand}
					disableRipple
					sx={{
						pl: 0,
						'&:hover': {
							bgcolor: 'transparent',
						},
						'&:active': {
							bgcolor: 'transparent',
						},
						'&:focus': {
							bgcolor: 'transparent',
						},
					}}
				>
					<ListItemText
						primary={
							<Stack direction="row" alignItems="center" flexWrap="wrap">
								<Box
									sx={{
										display: 'flex',
										alignItems: 'center',
										flex: 1,
									}}
								>
									<Typography variant="subtitle1" fontWeight="medium">
										{name}
									</Typography>
								</Box>
								{(successCount > 0 || failCount > 0) && (
									<Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
										<Chip
											label={`Успешно: ${successCount}`}
											size="small"
											color="success"
											variant="outlined"
										/>
										<Chip label={`Неудачно: ${failCount}`} size="small" color="error" variant="outlined" />
									</Box>
								)}
								{item.updatedAt && (
									<Typography variant="caption" sx={{ opacity: 0.7 }}>
										{formatRussianDate(item.updatedAt)}
									</Typography>
								)}
							</Stack>
						}
					/>
					{isExpanded ? <ExpandLess /> : <ExpandMore />}
				</ListItemButton>
			</ListItem>
			<Collapse in={isExpanded} timeout="auto" unmountOnExit>
				<StateDetails data={item.data} />
			</Collapse>
		</Paper>
	);
};
