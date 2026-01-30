import { BackpackCredentials } from '../../backpack/models/credentials.interface';
import { ExtendedCredentials } from '../../extended/models/credentials.interface';

export interface ExchangesConfig {
	backpack?: BackpackCredentials;
	extended?: ExtendedCredentials;
}
