import type { ActionsGroup } from '../../types/action.types';
import { ActionsGroupName, ActionName } from '../../types/action.types';

export const svmActions: ActionsGroup = {
	group: ActionsGroupName.Svm,
	premium: false,
	name: 'SVM',
	allowed: true,
	actions: [
		{ action: ActionName.SendToken, isolated: true, allowed: true, name: 'Отправка токенов' },
		{ action: ActionName.SendTokenToMany, isolated: false, allowed: true, name: 'Отправка токенов с 1 мейна' },
	],
};
