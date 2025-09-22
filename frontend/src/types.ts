export type SelectionBy = 'ui' | 'terminal' | null;
export interface SelectionStatus {
	chosenBy: SelectionBy;
	frozen: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LaunchParams = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionParams = any;

export interface Configs {
	launchParams: LaunchParams;
	functionParams: FunctionParams;
}
