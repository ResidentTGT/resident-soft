import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const plasmaActions: ActionsGroup = {
	group: ActionsGroupName.Plasma,
	premium: true,
	name: 'Plasma',
	allowed: false,
	actions: [{ action: ActionName.Deposit, isolated: true, allowed: true, name: '' }],
};
