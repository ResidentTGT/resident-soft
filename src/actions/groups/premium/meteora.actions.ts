import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const meteoaActions: ActionsGroup = {
	group: ActionsGroupName.Meteora,
	premium: true,
	name: 'Meteora',
	allowed: false,
	actions: [{ action: ActionName.AddLiquidity, isolated: true, allowed: true, name: 'Добавить LP' }],
};
