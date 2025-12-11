import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const bridgesActions: ActionsGroup = {
	group: ActionsGroupName.Bridges,
	premium: false,
	name: 'Bridges',
	allowed: true,
	actions: [
		{ action: ActionName.Stargate, isolated: true, allowed: true, name: 'Stargate' },
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
