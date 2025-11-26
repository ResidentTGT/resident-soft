import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const superchainActions: ActionsGroup = {
	group: ActionsGroupName.Superchain,
	premium: true,
	name: 'Superchain',
	allowed: true,
	actions: [
		{ action: ActionName.MakeTransactions, isolated: true, allowed: true, name: 'Набив транзакций' },
		{ action: ActionName.ClaimUi, isolated: true, allowed: true, name: 'Клейм бейджей через UI' },
	],
};
