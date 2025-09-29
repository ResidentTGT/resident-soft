import { useEffect, useMemo, useState } from 'react';
import { getConfigs, postConfigs } from '../api/client';
import { fetchActions } from '../services/actions';
import { functionParamSchemas } from '../services/functionParamSchemas';
import type { LaunchParams } from '../../../src/utils/launchParams.type';
import type { ActionsGroup } from '../../../src/actions';

export function useConfigState() {
	const [launchParams, setLaunchParams] = useState<LaunchParams>();
	const [functionParams, setFunctionParams] = useState<Record<string, any>>({});
	const [actions, setActions] = useState<ActionsGroup[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const [cfg, acts] = await Promise.all([getConfigs(), fetchActions()]);
				setLaunchParams((cfg as any).launchParams ?? {});
				setFunctionParams((cfg as any).functionParams ?? {});
				setActions(acts);
			} catch (e) {
				console.error(e);
				alert('Не удалось загрузить данные. Проверьте бэкенд.');
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const formInvalid = useMemo(() => {
		const ap = launchParams?.ACTION_PARAMS;
		if (!ap || !ap.group || !ap.action) return true;

		const nums: [any, number][] = [
			[launchParams.NUMBER_OF_THREADS, 1],
			[launchParams.NUMBER_OF_EXECUTIONS, 1],
			[launchParams.ATTEMPTS_UNTIL_SUCCESS, 1],
			[launchParams.WAIT_GAS_PRICE, 0],
			[launchParams.DELAY_AFTER_ERROR_IN_S, 0],
		];
		for (const [v, min] of nums) {
			if (v !== undefined && (Number.isNaN(Number(v)) || Number(v) < min)) return true;
		}

		if (launchParams.DELAY_BETWEEN_ACCS_IN_S) {
			const ok =
				Array.isArray(launchParams.DELAY_BETWEEN_ACCS_IN_S) &&
				launchParams.DELAY_BETWEEN_ACCS_IN_S.every((n: any) => typeof n === 'number' && n >= 0);
			if (!ok) return true;
		}

		const schema = launchParams.ACTION_PARAMS?.action && functionParamSchemas[launchParams.ACTION_PARAMS.action];
		if (schema && schema.length) {
			for (const fld of schema) {
				if (fld.kind === 'number' && fld.required) {
					const v = functionParams[fld.name];
					if (v === undefined || Number.isNaN(Number(v)) || (fld.min ?? -Infinity) > Number(v)) return true;
				}
				if (fld.kind === 'string' && fld.required) {
					const v = (functionParams[fld.name] ?? '').toString();
					if (!v) return true;
				}
				if (fld.kind === 'numberRange' && fld.required) {
					const v = functionParams[fld.name] as [number, number] | undefined;
					if (!v || v[0] === undefined || v[1] === undefined) return true;
				}
			}
		}

		return false;
	}, [launchParams, functionParams]);

	async function save() {
		if (formInvalid || !launchParams) return;
		setSaving(true);
		try {
			await postConfigs({ launchParams, functionParams });
			alert('Сохранено');
		} catch (e: any) {
			alert(e?.message || 'Ошибка сохранения');
		} finally {
			setSaving(false);
		}
	}

	return {
		launchParams,
		setLaunchParams,
		functionParams,
		setFunctionParams,
		actions,
		loading,
		saving,
		formInvalid,
		save,
	} as const;
}
