import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const afinaActions: ActionsGroup = {
	group: ActionsGroupName.Afina,
	premium: true,
	name: 'Afina',
	allowed: true,
	actions: [{ action: ActionName.GetProfiles, isolated: false, allowed: true, name: 'Получение профилей' }],
};
