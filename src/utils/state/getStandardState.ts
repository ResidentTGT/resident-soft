import { StandardState, StandardStateStatus } from './standardState.interface';
import { StateStorage } from './state';

export function getStandardState(name: string) {
	const state = StateStorage.load<StandardState>(name, {
		defaultState: { fails: [], successes: [], info: '', status: StandardStateStatus.Idle },
		readable: true,
		fileExt: '.json',
	});

	return state;
}
