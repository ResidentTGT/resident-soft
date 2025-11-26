import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const odosActions: ActionsGroup = {
	group: ActionsGroupName.Odos,
	premium: false,
	name: 'Odos',
	allowed: true,
	actions: [{ action: ActionName.Swap, isolated: true, allowed: true, name: 'Swap' }],
};
