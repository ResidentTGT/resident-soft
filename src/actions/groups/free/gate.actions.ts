import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const gateActions: ActionsGroup = {
	group: ActionsGroupName.Gate,
	premium: false,
	name: 'Gate',
	allowed: true,
	actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
};
