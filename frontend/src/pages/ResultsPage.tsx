// frontend/src/pages/ProcessPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Container,
	Paper,
	Alert,
	Stack,
	Typography,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Button,
	Chip,
	Grid,
	List,
	ListItem,
	ListItemText,
	Divider,
	CircularProgress,
	Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import type { StandardState } from '../../../src/utils/state/standardState.interface';

interface StatesIndexResp {
	states: { name: string; updatedAt: string; data: StandardState }[];
	failed?: { name: string; error?: string }[];
}

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
	const r = await fetch(url, { signal });
	if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
	return r.json() as Promise<T>;
}

const formatRu = (d?: string) => (d ? new Date(d).toLocaleString('ru-RU') : '');

// "resident_main_12" -> { base: "resident_main", num: "12" } (по последнему "_")
const splitByLastUnderscore = (s: string) => {
	const i = s.lastIndexOf('_');
	return i === -1 ? { base: s, num: s } : { base: s.slice(0, i), num: s.slice(i + 1) };
};

export default function ResultsPage() {
	const [names, setNames] = useState<string[]>([]);
	const [selected, setSelected] = useState<string>('');
	const [map, setMap] = useState<Record<string, { data: StandardState; updatedAt?: string }>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const fetchAll = async () => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);
		setError(null);

		try {
			const { states, failed } = await getJSON<StatesIndexResp>('/api/process/states', controller.signal);

			// имена в том же порядке, как пришли
			const list = states.map((s) => s.name);
			const m: Record<string, { data: StandardState; updatedAt?: string }> = {};
			for (const s of states) m[s.name] = { data: s.data, updatedAt: s.updatedAt };

			setNames(list);
			setMap(m);

			if (!selected || !list.includes(selected)) {
				const def = list.includes('swap') ? 'swap' : (list[0] ?? '');
				setSelected(def);
			}

			if (failed && failed.length) {
				const msg = failed.map((f) => (f.error ? `${f.name} (${f.error})` : f.name)).join(', ');
				setError(`Не удалось загрузить: ${msg}`);
			}
		} catch (e: any) {
			if (e?.name === 'AbortError') return;
			setNames([]);
			setMap({});
			setError(`Не удалось получить стейты: ${e.message ?? e}`);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAll();
	}, []);

	const current = selected ? map[selected] : undefined;
	const data = current?.data;
	const updatedAt = current?.updatedAt;

	const successCount = data?.successes.length ?? 0;
	const failCount = data?.fails.length ?? 0;

	const parsed = useMemo(() => {
		const succ = (data?.successes ?? []).map(splitByLastUnderscore);
		const fail = (data?.fails ?? []).map(splitByLastUnderscore);

		const cmp = (a: { num: string }, b: { num: string }) => {
			const ai = Number(a.num);
			const bi = Number(b.num);
			if (!Number.isNaN(ai) && !Number.isNaN(bi)) return ai - bi;
			return a.num.localeCompare(b.num, 'ru');
		};
		succ.sort(cmp);
		fail.sort(cmp);

		const bases = Array.from(new Set([...succ, ...fail].map((x) => x.base))).filter(Boolean);
		return { succ, fail, bases };
	}, [data]);

	const headerRight = (
		<Stack direction="row" spacing={1} alignItems="center">
			<Tooltip title="Обновить все стейты">
				<span>
					<Button
						variant="outlined"
						startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
						disabled={loading}
						onClick={fetchAll}
					>
						Обновить
					</Button>
				</span>
			</Tooltip>
		</Stack>
	);

	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			<Paper variant="outlined" sx={{ p: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
					<Typography variant="h6">Отображение стейтов</Typography>
					{headerRight}
				</Stack>

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
					<FormControl sx={{ minWidth: 260 }} disabled={loading || !names.length}>
						<InputLabel id="state-select-label">Стейт</InputLabel>
						<Select
							labelId="state-select-label"
							label="Стейт"
							value={selected}
							onChange={(e) => setSelected(String(e.target.value))}
						>
							{names.map((name) => (
								<MenuItem key={name} value={name}>
									{name}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<Stack direction="row" spacing={1} alignItems="center">
						<Chip label={`OK: ${successCount}`} color="success" variant="outlined" />
						<Chip label={`FAIL: ${failCount}`} color="error" variant="outlined" />
						{updatedAt && (
							<Typography variant="body2" sx={{ opacity: 0.7 }}>
								Обновлено: {formatRu(updatedAt)}
							</Typography>
						)}
					</Stack>
				</Stack>

				{loading && (
					<Stack alignItems="center" sx={{ py: 4 }}>
						<CircularProgress />
					</Stack>
				)}

				{!loading && data && (
					<>
						{parsed.bases.length > 0 && (
							<Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
								Название: {parsed.bases.join(', ')}
							</Typography>
						)}

						{data.info && (
							<Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
								{data.info}
							</Alert>
						)}

						<Grid container spacing={2}>
							<Grid size={{ xs: 12, sm: 6 }}>
								<Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<Typography variant="subtitle1">Успешно</Typography>
										<Chip size="small" label={successCount} color="success" />
									</Stack>
									<Divider sx={{ mb: 1 }} />
									{successCount === 0 ? (
										<Typography variant="body2" sx={{ opacity: 0.7 }}>
											Пока нет успешных запусков.
										</Typography>
									) : (
										<List dense>
											{parsed.succ.map(({ base, num }) => (
												<ListItem key={`${base}_${num}`} disableGutters>
													<ListItemText primary={num} />
												</ListItem>
											))}
										</List>
									)}
								</Paper>
							</Grid>

							<Grid size={{ xs: 12, sm: 6 }}>
								<Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<Typography variant="subtitle1">Неудачно</Typography>
										<Chip size="small" label={failCount} color="error" />
									</Stack>
									<Divider sx={{ mb: 1 }} />
									{failCount !== 0 && (
										<List dense>
											{parsed.fail.map(({ base, num }) => (
												<ListItem key={`${base}_${num}`} disableGutters>
													<ListItemText primary={num} />
												</ListItem>
											))}
										</List>
									)}
								</Paper>
							</Grid>
						</Grid>
					</>
				)}
			</Paper>
		</Container>
	);
}
