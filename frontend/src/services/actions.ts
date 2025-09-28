import type { ActionsGroup } from '../types/config';

// Временный мок. Заменить на реальный запрос при появлении эндпоинта.
export async function fetchActions(): Promise<ActionsGroup[]> {
	return [
		{
			group: 'Hemi',
			premium: true,
			actions: [{ action: 'CheckStats', isolated: false, needNetwork: true }],
		},
		{
			group: 'Plasma',
			premium: true,
			actions: [{ action: 'Deposit', isolated: true, needNetwork: true }],
		},
	];
}
