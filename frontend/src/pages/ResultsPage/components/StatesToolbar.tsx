import { Stack, Button, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface StatesToolbarProps {
	selectedCount: number;
	loading: boolean;
	deleting: boolean;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onDeleteSelected: () => void;
}

export const StatesToolbar = ({
	selectedCount,
	loading,
	deleting,
	onSelectAll,
	onDeselectAll,
	onDeleteSelected,
}: StatesToolbarProps) => {
	return (
		<Stack direction="row" spacing={2} mb={2} alignItems="center" sx={{ minHeight: 40 }} flexWrap="wrap">
			<Button size="small" variant="outlined" onClick={onSelectAll} disabled={loading}>
				Выбрать все
			</Button>
			<Button size="small" variant="outlined" onClick={onDeselectAll} disabled={loading || selectedCount === 0}>
				Снять выделение
			</Button>
			{selectedCount > 0 && (
				<>
					<Chip label={`Выбрано: ${selectedCount}`} size="small" color="primary" />
					<Button
						size="small"
						variant="contained"
						color="error"
						startIcon={<DeleteIcon />}
						onClick={onDeleteSelected}
						disabled={deleting}
					>
						Удалить выбранные
					</Button>
				</>
			)}
		</Stack>
	);
};
