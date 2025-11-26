import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const okxActions: ActionsGroup = {
	group: ActionsGroupName.Okx,
	premium: false,
	name: 'OKX',
	allowed: true,
	actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
};
