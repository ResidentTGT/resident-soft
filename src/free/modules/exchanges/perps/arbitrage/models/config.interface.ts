import { BackpackCredentials } from '../../backpack/models/credentials.interface';
import { ExtendedCredentials } from '../../extended/models/credentials.interface';

export interface ArbitrageConfig {
	backpack?: BackpackCredentials;
	extended?: ExtendedCredentials;
}
