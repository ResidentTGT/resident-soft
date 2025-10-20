import { type Selector } from '../../src/utils/selection';
import { type LaunchParams } from '../../src/utils/types/launchParams.type';
import { type FunctionParams } from '../../src/utils/types/functionParams.type';
export interface SelectionStatus {
	chosenBy: Selector;
	frozen: boolean;
}

export interface Configs {
	launchParams: LaunchParams;
	functionParams: FunctionParams;
}
