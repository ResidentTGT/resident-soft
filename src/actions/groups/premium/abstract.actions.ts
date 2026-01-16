import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const abstractActions: ActionsGroup = {
	group: ActionsGroupName.Abstract,
	premium: true,
	name: 'Abstract',
	allowed: true,
	actions: [
		{ action: ActionName.RegisterUi, isolated: true, allowed: true, name: 'Регистрация UI' },
		{ action: ActionName.RefuelGasZip, isolated: true, allowed: true, name: 'Пополнить аккаунт через GasZip' },
		{ action: ActionName.Vote, isolated: true, allowed: true, name: 'Vote' },
		{ action: ActionName.ConnectTwitter, isolated: true, allowed: true, name: 'Подключить Твиттер' },
		{ action: ActionName.Swap, isolated: true, allowed: true, name: 'Trade' },
		{ action: ActionName.ClaimUi, isolated: true, allowed: true, name: 'Клейм бейджей и проверка XP' },
		{ action: ActionName.CollectRedBullNft, isolated: true, allowed: true, name: 'Минт RedBull NFT' },
		{ action: ActionName.SpeedTrading, isolated: true, allowed: true, name: 'Speed Trading' },
	],
};
