import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const bybitActions: ActionsGroup = {
	group: ActionsGroupName.Bybit,
	premium: false,
	name: 'Bybit',
	allowed: true,
	actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
};
