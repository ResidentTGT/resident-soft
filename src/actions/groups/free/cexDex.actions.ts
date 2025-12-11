import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const cexDexActions: ActionsGroup = {
	group: ActionsGroupName.CexDex,
	premium: false,
	name: 'CEX | DEX',
	allowed: true,
	actions: [
		{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод с бирж' },
		{ action: ActionName.OdosSwap, isolated: true, allowed: true, name: 'Odos Swap' },
	],
};
