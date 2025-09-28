export type SelectionBy = 'ui' | 'terminal' | null;
export interface SelectionStatus {
	chosenBy: SelectionBy;
	frozen: boolean;
}

export type LaunchParams = any;

export type FunctionParams = any;

export interface Configs {
	launchParams: LaunchParams;
	functionParams: FunctionParams;
}
