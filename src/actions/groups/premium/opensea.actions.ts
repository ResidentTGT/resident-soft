import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const openseaActions: ActionsGroup = {
	group: ActionsGroupName.Opensea,
	premium: true,
	name: 'Opensea',
	allowed: true,
	actions: [
		{
			action: ActionName.OpenseaBuyByLink,
			isolated: true,
			allowed: false,
			name: 'Покупка 1 NFT по ссылке',
		},
		{ action: ActionName.ClaimUi, isolated: true, allowed: false, name: 'Клейм XP в квестах' },
		{
			action: ActionName.SweepByLink,
			isolated: true,
			allowed: true,
			name: 'Sweep коллекции по флору',
		},
		{
			action: ActionName.SellCollectionByLink,
			isolated: true,
			allowed: true,
			name: 'Продать все NFT из коллекции',
		},
		{ action: ActionName.Register, isolated: true, allowed: false, name: '' },
		{ action: ActionName.CrosschainMint, isolated: true, allowed: false, name: '' },
		{ action: ActionName.Mint, isolated: true, allowed: false, name: '' },
	],
};
