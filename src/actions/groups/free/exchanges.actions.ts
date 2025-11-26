import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const exchangesActions: ActionsGroup = {
	group: ActionsGroupName.Exchanges,
	premium: false,
	name: 'Биржи',
	allowed: true,
	actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод' }],
};
