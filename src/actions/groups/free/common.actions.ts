import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const commonActions: ActionsGroup = {
	group: ActionsGroupName.Common,
	premium: false,
	name: 'Общие',
	allowed: true,
	actions: [
		{ action: ActionName.CheckBalances, isolated: false, allowed: true, name: 'Проверить балансы' },
		{
			action: ActionName.GenerateWallets,
			isolated: false,
			allowed: true,
			name: 'Сгенерировать EVM кошельки',
		},
		{
			action: ActionName.GetAccounts,
			isolated: false,
			allowed: true,
			name: 'Получить аккаунты',
		},
	],
};
