import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const stargateActions: ActionsGroup = {
	group: ActionsGroupName.Stargate,
	premium: false,
	name: 'Stargate',
	allowed: true,
	actions: [{ action: ActionName.Bridge, isolated: true, allowed: true, name: 'Bridge' }],
};
