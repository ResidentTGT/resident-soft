export type ActionsGroupName = string;
export type ActionName = string;

export interface ActionDescriptor {
	action: ActionName;
	isolated: boolean;
	needNetwork: boolean;
}
export interface ActionsGroup {
	group: ActionsGroupName;
	premium: boolean;
	actions: ActionDescriptor[];
}

export interface LaunchParamsState {
	ACTION_PARAMS?: { group: ActionsGroupName; action: ActionName };
	NUMBER_OF_THREADS?: number;
	NUMBER_OF_EXECUTIONS?: number;
	SHUFFLE_ACCOUNTS?: boolean;
	PROXY?: boolean;
	ROTATE_PROXY?: boolean;
	TAKE_STATE?: boolean;
	STATE_NAME?: string;
	ATTEMPTS_UNTIL_SUCCESS?: number;
	WAIT_GAS_PRICE?: number;
	DELAY_BETWEEN_ACCS_IN_S?: number[];
	DELAY_AFTER_ERROR_IN_S?: number;
	CHAIN_ID?: number | string;
	USE_ENCRYPTION?: boolean;
	ENCRYPTION?: {
		ACCOUNTS_ENCRYPTED_PATH?: string;
		ACCOUNTS_DECRYPTED_PATH?: string;
		SECRET_STORAGE_ENCRYPTED_PATH?: string;
		SECRET_STORAGE_DECRYPTED_PATH?: string;
	};
	LICENSE?: string;
	[extra: string]: any;
}
