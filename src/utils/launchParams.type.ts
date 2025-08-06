import { ChainId } from '@utils/network';
import { JobAccount } from '@utils/job';
import { ActionName, ActionsGroupName } from '../actions';

export interface LaunchParams {
	ACTION_PARAMS: {
		group: ActionsGroupName;
		action: ActionName;
	};
	NUMBER_OF_THREADS: number;
	NUMBER_OF_EXECUTIONS: number;
	SHUFFLE_ACCOUNTS: boolean;
	PROXY: boolean;
	ROTATE_PROXY: boolean;
	TAKE_STATE: boolean;
	STATE_NAME: string;
	UNTIL_SUCCESS: boolean;
	WAIT_GAS_PRICE: number;
	DELAY_BETWEEN_ACCS_IN_S: number[];
	DELAY_AFTER_ERROR_IN_S: number;
	CHAIN_ID: ChainId;
	JOB_ACCOUNTS: JobAccount[];
	USE_ENCRYPTION: boolean;
	ENCRYPTION: {
		ACCOUNTS_ENCRYPTED_PATH: string;
		ACCOUNTS_DECRYPTED_PATH: string;
		SECRET_STORAGE_ENCRYPTED_PATH: string;
		SECRET_STORAGE_DECRYPTED_PATH: string;
	};
	LICENSE: string;
}
