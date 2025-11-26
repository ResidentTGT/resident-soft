import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const checkersActions: ActionsGroup = {
	group: ActionsGroupName.Checkers,
	premium: false,
	name: 'Чекеры и клеймы',
	allowed: false,
	actions: [
		{ action: ActionName.Linea, isolated: false, allowed: true, name: '' },
		{ action: ActionName.Claim, isolated: true, allowed: true, name: '' },
	],
};
