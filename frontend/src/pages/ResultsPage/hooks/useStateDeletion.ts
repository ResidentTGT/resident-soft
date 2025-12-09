import { useState, useCallback } from 'react';
import { deleteStates } from '../../../api';
import { BULK_DELETE_TARGET } from '../constants';

interface UseStateDeletionParams {
	onSuccess: () => void;
	onError: (message: string) => void;
	onPartialSuccess: (succeeded: number, failed: number) => void;
	onComplete?: () => void;
}

export const useStateDeletion = ({ onSuccess, onError, onPartialSuccess, onComplete }: UseStateDeletionParams) => {
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const executeDelete = useCallback(
		async (statesToDelete: string[]) => {
			if (statesToDelete.length === 0) return;

			setDeleting(true);

			try {
				const fileNames = statesToDelete.map((name) => `${name}.json`);
				const result = await deleteStates(fileNames);

				const succeeded = result.results.filter((r) => r.success);
				const failed = result.results.filter((r) => !r.success);

				setDeleteTarget(null);

				if (failed.length === 0) {
					onSuccess();
				} else if (succeeded.length === 0) {
					const failedNames = failed.map((f) => f.fileName).join(', ');
					onError(`Не удалось удалить ни один стейт: ${failedNames}`);
				} else {
					onPartialSuccess(succeeded.length, failed.length);
				}

				// Refresh the list after deletion (success or partial success)
				if (succeeded.length > 0 && onComplete) {
					onComplete();
				}
			} catch (e: any) {
				onError(`Не удалось удалить стейты: ${e?.message ?? e}`);
			} finally {
				setDeleting(false);
			}
		},
		[onSuccess, onError, onPartialSuccess, onComplete],
	);

	const confirmDelete = useCallback(
		async (selectedStates: Set<string>) => {
			const statesToDelete =
				deleteTarget === BULK_DELETE_TARGET ? Array.from(selectedStates) : deleteTarget ? [deleteTarget] : [];

			await executeDelete(statesToDelete);
		},
		[deleteTarget, executeDelete],
	);

	const cancelDelete = useCallback(() => {
		setDeleteTarget(null);
	}, []);

	const initiateDelete = useCallback((target: string) => {
		setDeleteTarget(target);
	}, []);

	return {
		deleteTarget,
		deleting,
		confirmDelete,
		cancelDelete,
		initiateDelete,
	};
};
