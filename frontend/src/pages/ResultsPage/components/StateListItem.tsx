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
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import type { StateItem } from '../constants';
import { formatRussianDate } from '../utils';
import { StateDetails } from './StateDetails';

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
					sx={{ mx: 1, my: 1 }}
				/>
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
							<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
								<Typography variant="subtitle1" fontWeight="medium">
									{name}
								</Typography>
								<Chip label={`Успешно: ${successCount}`} size="small" color="success" variant="outlined" />
								<Chip label={`Неудачно: ${failCount}`} size="small" color="error" variant="outlined" />
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
