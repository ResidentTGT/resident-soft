import { Logger, MessageType } from '@utils/logger';
import { Account } from '@utils/account/models';
import { LaunchParams } from '@utils/launchParams.type';
import { getStandardState } from '@utils/state/getStandardState';

export async function filterAccounts(accountsList: Account[], LAUNCH_PARAMS: LaunchParams): Promise<Account[]> {
	const allAccs: Account[] = [];

	for (const jobAcc of LAUNCH_PARAMS.JOB_ACCOUNTS) {
		let accounts: Account[] = [];
		if (jobAcc.include.length) {
			const accsSet = new Set<Account>();
			jobAcc.include.forEach((a: any) => {
				const account = accountsList.find((pp) => {
					if (!pp.name) throw new Error();
					return a.toString() === pp.name || `${jobAcc.file}_${a.toString()}` === pp.name;
				});
				if (!account) {
					Logger.getInstance().log(`There is no ${jobAcc.file}_${a} account`, MessageType.Error);
					throw new Error();
				}
				accsSet.add(account);
			});
			accounts = Array.from(accsSet);
		} else {
			if (jobAcc.end === 0) {
				accounts = accountsList.filter((a) => {
					if (!a.name) throw new Error();
					return a.name.includes(`${jobAcc.file}`);
				});
			} else {
				const allIndexes = Array.from({ length: jobAcc.end - jobAcc.start + 1 }, (_, i) => jobAcc.start + i);
				const allNames = allIndexes.map((a) => `${jobAcc.file}_${a}`);
				accounts = accountsList.filter((a) => {
					if (!a.name) throw new Error();
					return allNames.includes(a.name);
				});
			}
		}

		accounts = accounts.filter(
			(a) =>
				!jobAcc.exclude.some((aa: any) => {
					if (!a.name) throw new Error();
					return aa.toString() === a.name || `${jobAcc.file}_${aa.toString()}` === a.name;
				}),
		);

		const accountsWithoutState = accounts.length;
		if (accountsWithoutState === 0) {
			await Logger.getInstance().log(
				`Selected 0 accounts. Check LAUNCH_PARAMS.jsonc or accounts files.`,
				MessageType.Notice,
			);
		}

		if (LAUNCH_PARAMS.TAKE_STATE && LAUNCH_PARAMS.STATE_NAME) {
			const STANDARD_STATE = getStandardState(LAUNCH_PARAMS.STATE_NAME);

			accounts = accounts.filter((a) => (a.name ? !STANDARD_STATE.successes.includes(a.name) : true));
			if (accounts.length === 0 && accountsWithoutState > accounts.length) {
				await Logger.getInstance().log(
					`All selected accounts (${accountsWithoutState}) have already been successfully completed. Check state "${LAUNCH_PARAMS.STATE_NAME}.json"`,
					MessageType.Notice,
				);
			}
		}

		allAccs.push(...accounts);
	}
	return allAccs;
}
