import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const sophonActions: ActionsGroup = {
	group: ActionsGroupName.Sophon,
	premium: true,
	name: 'Sophon',
	allowed: true,
	actions: [{ action: ActionName.Claim, isolated: true, allowed: true, name: 'Клейм наград за делегаторство' }],
};
