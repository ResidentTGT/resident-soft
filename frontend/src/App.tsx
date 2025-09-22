import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SelectionStatus } from './types'; // поправь путь под свой проект
import { getSelection, getConfigs, postConfigs, chooseUI } from './api/client';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Toolbar } from './components/Toolbar';

export default function App() {
	const [launchText, setLaunchText] = useState('');
	const [funcText, setFuncText] = useState('');

	const [launchErr, setLaunchErr] = useState<string | null>(null);
	const [funcErr, setFuncErr] = useState<string | null>(null);

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [choosing, setChoosing] = useState(false);
	const [status, setStatus] = useState<SelectionStatus>({ chosenBy: null, frozen: false });
	const pollTimer = useRef<number | null>(null);

	const locked = useMemo(() => status.chosenBy !== null, [status.chosenBy]);
	const hasJsonErrors = Boolean(launchErr || funcErr);

	// Initial load
	useEffect(() => {
		(async () => {
			try {
				const [s0, c] = await Promise.all([getSelection(), getConfigs()]);
				setStatus(s0);
				setLaunchText(JSON.stringify(c.launchParams ?? {}, null, 2));
				setFuncText(JSON.stringify(c.functionParams ?? {}, null, 2));
			} catch (e) {
				console.error(e);
				alert('Failed to load initial data. Check backend logs.');
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	// Poll until selected
	useEffect(() => {
		if (status.chosenBy !== null) return;
		pollTimer.current = window.setInterval(async () => {
			try {
				setStatus(await getSelection());
			} catch (error) {
				console.warn('Polling error:', error);
			}
		}, 1500) as unknown as number;
		return () => {
			if (pollTimer.current) window.clearInterval(pollTimer.current);
			pollTimer.current = null;
		};
	}, [status.chosenBy]);

	function onLaunchChange(v: string) {
		setLaunchText(v);
		try {
			JSON.parse(v);
			setLaunchErr(null);
		} catch (e: any) {
			setLaunchErr(e.message);
		}
	}
	function onFuncChange(v: string) {
		setFuncText(v);
		try {
			JSON.parse(v);
			setFuncErr(null);
		} catch (e: any) {
			setFuncErr(e.message);
		}
	}

	async function handleSave() {
		if (locked || hasJsonErrors) return;
		setSaving(true);
		try {
			await postConfigs({
				launchParams: safeParse(launchText, {}),
				functionParams: safeParse(funcText, {}),
			});
			alert('Сохранено');
		} catch (e: any) {
			if (e?.code === 423) {
				setStatus(await getSelection());
				alert('Конфиги уже заблокированы: выбор сделан (UI/Terminal)');
			} else {
				alert(e?.message || 'Ошибка сохранения');
			}
		} finally {
			setSaving(false);
		}
	}

	async function handleRunWithoutSave() {
		setChoosing(true);
		try {
			const s1 = await chooseUI();
			setStatus(s1);
		} catch (e: any) {
			if (e?.code === 409) {
				const s2 = await getSelection();
				setStatus(s2);
				alert(`Уже выбрано: ${s2.chosenBy}`);
			} else {
				alert(e?.message || 'Не удалось продолжить');
			}
		} finally {
			setChoosing(false);
		}
	}

	async function handleSaveAndRun() {
		if (!locked) await handleSave();
		if (!locked) await handleRunWithoutSave();
	}

	if (loading)
		return (
			<Shell>
				<div className="mt-6">Загрузка…</div>
			</Shell>
		);

	return (
		<Shell>
			<Header status={status} />

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
				<Editor title="launchParams" value={launchText} onChange={onLaunchChange} error={launchErr} readOnly={locked} />
				<Editor title="functionParams" value={funcText} onChange={onFuncChange} error={funcErr} readOnly={locked} />
			</div>

			<Toolbar
				locked={locked}
				saving={saving}
				choosing={choosing}
				hasJsonErrors={hasJsonErrors}
				onSave={handleSave}
				onRun={handleRunWithoutSave}
				onSaveAndRun={handleSaveAndRun}
			/>

			{locked && (
				<div className="mt-6 p-3 rounded-xl border">
					<b>Конфиги заблокированы</b>: выбран путь <i>{status.chosenBy}</i>. Редактирование отключено.
				</div>
			)}
		</Shell>
	);
}

function Shell({ children }: { children: React.ReactNode }) {
	return <div className="p-6 shell">{children}</div>;
}

function safeParse<T>(s: string, fallback: T): T {
	try {
		return JSON.parse(s) as T;
	} catch {
		return fallback;
	}
}
