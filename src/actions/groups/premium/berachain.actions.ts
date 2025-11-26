import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const berachainActions: ActionsGroup = {
	group: ActionsGroupName.Berachain,
	premium: true,
	name: 'Berachain',
	allowed: false,
	actions: [
		{ action: ActionName.HoneypotSwap, isolated: true, allowed: true, name: '' },
		{ action: ActionName.HoneyfunCreateMeme, isolated: true, allowed: true, name: '' },
		{ action: ActionName.HoneyfunSellAllMemes, isolated: true, allowed: true, name: '' },
		{ action: ActionName.DapDap, isolated: true, allowed: true, name: '' },
		{ action: ActionName.KodiakSwap, isolated: true, allowed: true, name: '' },
		{ action: ActionName.JunkyUrsas, isolated: true, allowed: true, name: '' },
		{ action: ActionName.ClaimBgtAndRedeemAndSendToOkx, isolated: true, allowed: true, name: '' },
		{ action: ActionName.FlyTradeSwap, isolated: true, allowed: true, name: '' },
		{ action: ActionName.CheckStats, isolated: true, allowed: true, name: '' },
		{ action: ActionName.Outpostsurge, isolated: true, allowed: true, name: '' },
		{ action: ActionName.Yeet, isolated: true, allowed: true, name: '' },
		{ action: ActionName.YeetGetTodayValues, isolated: true, allowed: true, name: '' },
	],
};
