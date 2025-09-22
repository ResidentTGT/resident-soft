export function Badge({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'info' }) {
	const toneClass = tone === 'ok' ? 'badge_ok' : tone === 'warn' ? 'badge_warn' : 'badge_info';
	return <span className={`badge ${toneClass}`}>{text}</span>;
}
