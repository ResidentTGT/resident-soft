import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { BULK_DELETE_TARGET, type StateItem } from '../constants';

interface DeleteConfirmDialogProps {
	deleteTarget: string | null;
	selectedStates: Set<string>;
	statesMap: Record<string, StateItem>;
	deleting: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export const DeleteConfirmDialog = ({
	deleteTarget,
	selectedStates,
	statesMap,
	deleting,
	onConfirm,
	onCancel,
}: DeleteConfirmDialogProps) => {
	const isBulkDelete = deleteTarget === BULK_DELETE_TARGET;
	const targetData = deleteTarget && !isBulkDelete ? statesMap[deleteTarget]?.data : undefined;
	const successCount = targetData?.successes.length ?? 0;
	const failCount = targetData?.fails.length ?? 0;

	return (
		<Dialog open={deleteTarget !== null} onClose={onCancel}>
			<DialogTitle>Удалить стейты</DialogTitle>
			<DialogContent>
				<DialogContentText component="div">
					{isBulkDelete ? (
						<>
							Вы точно хотите удалить <b>{selectedStates.size}</b> стейтов?
							<br />
							<br />
							{Array.from(selectedStates)
								.slice(0, 5)
								.map((name) => (
									<div key={name}>• {name}</div>
								))}
							{selectedStates.size > 5 && <div>... и ещё {selectedStates.size - 5}</div>}
						</>
					) : (
						<>
							Вы точно хотите удалить стейт <b>{deleteTarget || '(не выбран)'}</b>?
							<br />
							<br />
							Успешно: <b>{successCount}</b>, Неудачно: <b>{failCount}</b>
						</>
					)}
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel} disabled={deleting}>
					Отмена
				</Button>
				<Button color="error" variant="contained" onClick={onConfirm} disabled={deleting}>
					{deleting ? 'Удаление...' : 'Удалить'}
				</Button>
			</DialogActions>
		</Dialog>
	);
};
