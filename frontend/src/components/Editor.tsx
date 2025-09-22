import { Badge } from './Badge';

export function Editor({
	title,
	value,
	onChange,
	error,
	readOnly,
}: {
	title: string;
	value: string;
	onChange: (v: string) => void;
	error: string | null;
	readOnly?: boolean;
}) {
	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<div className="label">{title}</div>
				{readOnly && <Badge text="read-only" tone="info" />}
			</div>

			<textarea
				className="w-full h-[320px] p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.1)] textarea"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				readOnly={readOnly}
			/>
			{error && <div className="error">JSON error: {error}</div>}
		</div>
	);
}
