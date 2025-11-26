import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const visionActions: ActionsGroup = {
	group: ActionsGroupName.Vision,
	premium: true,
	name: 'Vision',
	allowed: true,
	actions: [{ action: ActionName.GetProfiles, isolated: false, allowed: true, name: 'Получение профилей' }],
};
