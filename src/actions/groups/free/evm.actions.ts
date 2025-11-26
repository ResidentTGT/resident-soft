import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const evmActions: ActionsGroup = {
	group: ActionsGroupName.Evm,
	premium: false,
	name: 'EVM',
	allowed: true,
	actions: [
		{ action: ActionName.SendToken, isolated: true, allowed: true, name: 'Отправка токенов' },
		{
			action: ActionName.CheckNft,
			isolated: false,
			allowed: true,
			name: 'Проверить наличие NFT ERC-721',
		},
		{
			action: ActionName.CheckTransactions,
			isolated: true,
			allowed: false,
			name: 'Проверить транзакции',
		},
		{ action: ActionName.Wrap, isolated: true, allowed: true, name: 'Wrap' },
		{ action: ActionName.Unwrap, isolated: true, allowed: true, name: 'Unwrap' },
		{ action: ActionName.Approve, isolated: true, allowed: true, name: 'Approve' },
		{
			action: ActionName.MakeTransaction,
			isolated: true,
			allowed: true,
			name: 'Сделать кастомную транзакцию',
		},
	],
};
