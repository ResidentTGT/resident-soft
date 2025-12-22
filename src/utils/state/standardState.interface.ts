import type { LaunchParams } from '../types/launchParams.type';

export enum StandardStateStatus {
	Idle = 1,
	Process = 2,
	Finish = 3,
	Fail = 4,
}

export interface StandardState {
	successes: string[];
	fails: string[];
	info: string;
	status: StandardStateStatus;
	createdAt?: string;
	launchParams?: LaunchParams;
	actionFunctionParams?: any;
}
