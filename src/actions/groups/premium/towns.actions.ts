import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const townsActions: ActionsGroup = {
	group: ActionsGroupName.Towns,
	premium: true,
	name: 'Towns',
	allowed: false,
	actions: [
		{ action: ActionName.Bober, isolated: true, allowed: true, name: '' },
		{ action: ActionName.JoinTown, isolated: true, allowed: true, name: '' },
		{
			action: ActionName.RandomActionInRandomChannelInNativeTown,
			isolated: true,
			allowed: true,
			name: '',
		},
		{
			action: ActionName.RandomActionInRandomChannelInRandomTown,
			isolated: true,
			allowed: true,
			name: '',
		},
		{ action: ActionName.Review, isolated: true, allowed: true, name: '' },
	],
};
