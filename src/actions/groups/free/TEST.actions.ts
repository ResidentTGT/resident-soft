import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const testActions: ActionsGroup = {
	group: ActionsGroupName.TEST,
	premium: false,
	name: 'TEST',
	allowed: false,
	actions: [{ action: ActionName.TEST, isolated: true, allowed: true, name: 'TEST' }],
};
