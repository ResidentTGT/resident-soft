import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const hemiActions: ActionsGroup = {
	group: ActionsGroupName.Hemi,
	premium: true,
	name: 'Hemi',
	allowed: false,
	actions: [{ action: ActionName.CheckStats, isolated: false, allowed: true, name: '' }],
};
