import { useMemo } from 'react';
import type { SelectionStatus } from '../types'; // поправь путь под свой проект
import { Badge } from './Badge';

export function Header({ status }: { status: SelectionStatus }) {
	const badge = useMemo(() => {
		if (status.chosenBy === 'ui') return <Badge text="Locked by UI" tone="ok" />;
		if (status.chosenBy === 'terminal') return <Badge text="Locked by Terminal" tone="warn" />;
		return <Badge text="Waiting for selection: UI or Terminal" tone="info" />;
	}, [status.chosenBy]);

	return (
		<div className="flex items-center justify-between gap-4">
			<h1 className="text-xl font-bold">Resident — Config Editor</h1>
			{badge}
		</div>
	);
}
