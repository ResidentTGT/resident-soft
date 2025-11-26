import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const shapeActions: ActionsGroup = {
	group: ActionsGroupName.Shape,
	premium: true,
	name: 'Shape',
	allowed: true,
	actions: [
		{ action: ActionName.MintStack, isolated: true, allowed: false, name: '' },
		{ action: ActionName.MintForms, isolated: true, allowed: false, name: '' },
		{ action: ActionName.Claim, isolated: true, allowed: true, name: 'Клейм всех медалей' },
		{ action: ActionName.ConnectTwitter, isolated: true, allowed: false, name: '' },
		{ action: ActionName.ConnectDiscord, isolated: true, allowed: false, name: '' },
		{ action: ActionName.CheckStats, isolated: true, allowed: false, name: '' },
		{ action: ActionName.OtomMint, isolated: true, allowed: false, name: '' },
		{ action: ActionName.OtomAnnihilate, isolated: true, allowed: false, name: '' },
		{ action: ActionName.OtomAnalyze, isolated: true, allowed: false, name: '' },
		{ action: ActionName.OtomMineAllOtoms, isolated: true, allowed: false, name: '' },
		{ action: ActionName.OtomMineMolecule, isolated: true, allowed: false, name: '' },
		{ action: ActionName.OtomMineOtom, isolated: true, allowed: false, name: '' },
		{ action: ActionName.OtomMineAndAnnihilateMolecule, isolated: true, allowed: false, name: '' },
		{ action: ActionName.OtomCraftPkax, isolated: true, allowed: false, name: '' },
		{ action: ActionName.ParseIsotopes, isolated: false, allowed: true, name: 'Спарсить все изотопы' },
		{ action: ActionName.OtomMineAllIsotopes, isolated: true, allowed: true, name: 'Минтить все изотопы' },
		{ action: ActionName.Spin, isolated: true, allowed: true, name: 'Спин' },
	],
};
