import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const testPremiumActions: ActionsGroup = {
	group: ActionsGroupName.TEST_PREMIUM,
	premium: true,
	name: 'TEST_PREMIUM',
	allowed: false,
	actions: [{ action: ActionName.TEST, isolated: true, allowed: true, name: '' }],
};
