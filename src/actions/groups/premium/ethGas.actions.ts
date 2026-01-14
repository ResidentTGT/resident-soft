import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const ethGasActions: ActionsGroup = {
	group: ActionsGroupName.EthGas,
	premium: true,
	name: 'EthGas',
	allowed: true,
	actions: [
		{
			action: ActionName.CreateGasReport,
			isolated: true,
			allowed: true,
			name: 'Create Gas Report',
		},
	],
};
