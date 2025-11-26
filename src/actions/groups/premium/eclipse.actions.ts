import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const eclipseActions: ActionsGroup = {
	group: ActionsGroupName.Eclipse,
	premium: true,
	name: 'Eclipse',
	allowed: false,
	actions: [
		{ action: ActionName.Tap, isolated: true, allowed: true, name: '' },
		{ action: ActionName.Withdraw, isolated: true, allowed: true, name: '' },
	],
};
