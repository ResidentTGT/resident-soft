import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const symbioticActions: ActionsGroup = {
	group: ActionsGroupName.Symbiotic,
	premium: false,
	name: 'Symbiotic',
	allowed: true,
	actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывести все средства' }],
};
