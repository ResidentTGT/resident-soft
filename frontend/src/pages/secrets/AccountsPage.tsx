import React from 'react';

import type { Account } from '../../../../src/utils/account/models/account.type';

export interface AccountsFile {
	fileName: string;
	accounts: Account[];
}

interface Props {
	encrypted?: AccountsFile[];
	decrypted?: AccountsFile[];
	setEncrypted?: React.Dispatch<React.SetStateAction<AccountsFile[]>>;
	setDecrypted?: React.Dispatch<React.SetStateAction<AccountsFile[]>>;
	loading?: boolean;
	saving?: boolean;
	onSave?: () => Promise<void> | void;
}

export default function AccountsPage({ encrypted, decrypted, setEncrypted, setDecrypted, loading, saving, onSave }: Props) {
	return <></>;
}
