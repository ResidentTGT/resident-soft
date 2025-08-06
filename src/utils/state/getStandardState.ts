import { StandardState } from './standardState.interface';
import { StateStorage } from './state';

export function getStandardState(name: string) {
	const state = StateStorage.load<StandardState>(name, {
		defaultState: { fails: [], successes: [], info: '' },
		readable: true,
		fileExt: '.json',
	});

	return state;
}
