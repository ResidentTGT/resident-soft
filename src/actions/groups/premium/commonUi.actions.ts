import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const commonUiActions: ActionsGroup = {
	group: ActionsGroupName.CommonUi,
	premium: true,
	name: 'Общие UI',
	allowed: true,
	actions: [
		{
			action: ActionName.OpenPages,
			isolated: true,
			allowed: true,
			name: 'Открыть страницы в браузере',
		},
		{
			action: ActionName.LoginInMetamask,
			isolated: true,
			allowed: true,
			name: 'Логин в расширении Metamask',
		},
		{
			action: ActionName.RestoreMetamask,
			isolated: true,
			allowed: true,
			name: 'Восстановление расширения Metamask',
		},
		{
			action: ActionName.RestorePetra,
			isolated: true,
			allowed: true,
			name: 'Восстановление расширения Petra',
		},
		{
			action: ActionName.RestoreBackpack,
			isolated: true,
			allowed: true,
			name: 'Восстановление расширения Backpack',
		},
		{
			action: ActionName.RestoreArgent,
			isolated: true,
			allowed: false,
			name: 'Восстановление расширения Argent',
		},
		{
			action: ActionName.LoginInRabby,
			isolated: true,
			allowed: true,
			name: 'Логин в расширении Rabby',
		},
		{
			action: ActionName.RestoreRabby,
			isolated: true,
			allowed: true,
			name: 'Восстановление расширения Rabby',
		},
		{
			action: ActionName.RestorePhantom,
			isolated: true,
			allowed: true,
			name: 'Восстановление расширения Phantom',
		},
	],
};
