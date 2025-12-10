import { useState, useCallback, useRef, useEffect } from 'react';
import { getStates } from '../../../api';
import type { StateItem } from '../constants';

export const useStates = () => {
	const [statesMap, setStatesMap] = useState<Record<string, StateItem>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const fetchStates = useCallback(async () => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);
		setError(null);

		try {
			const { states, failed } = await getStates(controller.signal);

			const newStatesMap: Record<string, StateItem> = {};
			for (const s of states) {
				newStatesMap[s.name] = { data: s.data, updatedAt: s.updatedAt };
			}

			setStatesMap(newStatesMap);
			setLastUpdated(new Date());

			if (failed && failed.length) {
				const msg = failed.map((f) => (f.error ? `${f.name} (${f.error})` : f.name)).join(', ');
				setError(`Не удалось загрузить: ${msg}`);
			}
		} catch (e: any) {
			if (e?.name === 'AbortError') return;
			setStatesMap({});
			setError(`Не удалось получить стейты: ${e.message ?? e}`);
		} finally {
			setLoading(false);
		}
	}, []);

	const refreshManually = useCallback(() => {
		fetchStates();
	}, [fetchStates]);

	// Initial load only
	useEffect(() => {
		fetchStates();

		return () => {
			abortRef.current?.abort();
		};
	}, [fetchStates]);

	return {
		statesMap,
		loading,
		error,
		lastUpdated,
		refreshManually,
	};
};
