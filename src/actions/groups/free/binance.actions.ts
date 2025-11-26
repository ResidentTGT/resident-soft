import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const binanceActions: ActionsGroup = {
	group: ActionsGroupName.Binance,
	premium: false,
	name: 'Binance',
	allowed: true,
	actions: [{ action: ActionName.Withdraw, isolated: true, allowed: true, name: 'Вывод средств' }],
};
