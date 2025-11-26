import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const adsPowerActions: ActionsGroup = {
	group: ActionsGroupName.AdsPower,
	premium: true,
	name: 'AdsPower',
	allowed: true,
	actions: [{ action: ActionName.GetProfiles, isolated: false, allowed: true, name: 'Получение профилей' }],
};
