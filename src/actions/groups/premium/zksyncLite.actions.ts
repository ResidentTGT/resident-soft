import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const zksyncLiteActions: ActionsGroup = {
	group: ActionsGroupName.ZksyncLite,
	premium: true,
	name: 'Zksync Lite',
	allowed: true,
	actions: [{ action: ActionName.SendToken, isolated: true, allowed: true, name: 'Отправка токенов через UI' }],
};
