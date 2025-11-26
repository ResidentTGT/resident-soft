import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const polymarketActions: ActionsGroup = {
	group: ActionsGroupName.Polymarket,
	premium: true,
	name: 'Polymarket',
	allowed: true,
	actions: [{ action: ActionName.ClaimUi, isolated: true, allowed: true, name: 'Клейм наград (UI)' }],
};
