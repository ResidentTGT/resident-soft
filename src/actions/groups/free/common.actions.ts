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
		{ action: ActionName.RefuelGasZip, isolated: true, allowed: true, name: 'Refuel через GasZip' },
		{
			action: ActionName.RefuelRelayLink,
			isolated: true,
			allowed: true,
			name: 'Refuel через RelayLink',
		},
		{
			action: ActionName.RefuelManyGasZip,
			isolated: false,
			allowed: true,
			name: 'Refuel с одного кошелька на множество других через GasZip',
		},
		{
			action: ActionName.RefuelManyRelayLink,
			isolated: false,
			allowed: true,
			name: 'Refuel с одного кошелька на множество других через RelayLink',
		},
	],
};
