import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const bitgetActions: ActionsGroup = {
	group: ActionsGroupName.Bitget,
	premium: false,
	name: 'Bitget',
	allowed: true,
	actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
};
