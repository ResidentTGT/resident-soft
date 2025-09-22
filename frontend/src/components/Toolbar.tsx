export function Toolbar({
	locked,
	saving,
	choosing,
	hasJsonErrors,
	onSave,
	onRun,
	onSaveAndRun,
}: {
	locked: boolean;
	saving: boolean;
	choosing: boolean;
	hasJsonErrors: boolean;
	onSave: () => void | Promise<void>;
	onRun: () => void | Promise<void>;
	onSaveAndRun: () => void | Promise<void>;
}) {
	return (
		<div className="flex flex-wrap gap-3 mt-6">
			<button
				className="px-4 py-2 rounded-xl shadow disabled:opacity-50"
				onClick={onSave}
				disabled={locked || saving || hasJsonErrors}
				title={locked ? 'Configs are locked by selection' : ''}
			>
				{saving ? 'Сохранение…' : 'Сохранить'}
			</button>

			<button className="px-4 py-2 rounded-xl shadow disabled:opacity-50" onClick={onRun} disabled={choosing || locked}>
				{choosing ? 'Продолжаем…' : 'Продолжить (без сохранения)'}
			</button>

			<button
				className="px-4 py-2 rounded-xl shadow disabled:opacity-50"
				onClick={onSaveAndRun}
				disabled={choosing || locked || saving || hasJsonErrors}
			>
				{choosing ? 'Продолжаем…' : 'Сохранить и продолжить'}
			</button>
		</div>
	);
}
