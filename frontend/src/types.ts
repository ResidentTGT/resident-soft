import { type Selector } from '../../src/server/selection';
import { type LaunchParams } from '../../src/utils/launchParams.type';

export interface SelectionStatus {
	chosenBy: Selector;
	frozen: boolean;
}

export type FunctionParams = any;

export interface Configs {
	launchParams: LaunchParams;
	functionParams: FunctionParams;
}
