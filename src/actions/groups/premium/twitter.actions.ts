import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const twitterActions: ActionsGroup = {
	group: ActionsGroupName.Twitter,
	premium: true,
	name: 'Twitter',
	allowed: true,
	actions: [
		{ action: ActionName.Follow, isolated: true, allowed: true, name: 'Подписаться' },
		{ action: ActionName.LikeAndRetweet, isolated: true, allowed: true, name: 'Лайк и ретвит' },
		{ action: ActionName.Login, isolated: true, allowed: true, name: 'Логин через логин/пароль' },
		{ action: ActionName.LoginByToken, isolated: true, allowed: true, name: 'Логин по токену' },
		{ action: ActionName.Post, isolated: true, allowed: true, name: 'Написать пост' },
		{ action: ActionName.Quote, isolated: true, allowed: true, name: 'Quote' },
		{ action: ActionName.OutlookLogin, isolated: true, allowed: false, name: '' },
		{ action: ActionName.ChangeName, isolated: true, allowed: false, name: '' },
		{ action: ActionName.GetProfileInfo, isolated: true, allowed: false, name: '' },
		{ action: ActionName.Reply, isolated: true, allowed: true, name: 'Reply' },
	],
};
