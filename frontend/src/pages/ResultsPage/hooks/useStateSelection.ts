import { useState, useCallback } from 'react';

export const useStateSelection = () => {
	const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());

	const selectAll = useCallback((stateNames: string[]) => {
		setSelectedStates(new Set(stateNames));
	}, []);

	const deselectAll = useCallback(() => {
		setSelectedStates(new Set());
	}, []);

	const toggleSelection = useCallback((name: string) => {
		setSelectedStates((prev) => {
			const next = new Set(prev);
			if (next.has(name)) {
				next.delete(name);
			} else {
				next.add(name);
			}
			return next;
		});
	}, []);

	return {
		selectedStates,
		selectAll,
		deselectAll,
		toggleSelection,
	};
};
