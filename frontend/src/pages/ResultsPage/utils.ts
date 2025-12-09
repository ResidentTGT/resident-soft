import type { StandardState } from '../../../../src/utils/state/standardState.interface';

interface AccountWithNumber {
	base: string;
	num: string;
}

export const formatRussianDate = (dateString?: string): string => {
	return dateString ? new Date(dateString).toLocaleString('ru-RU') : '';
};

export const formatRelativeTime = (date: Date): string => {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);

	if (diffSec < 60) return `${diffSec} секунд назад`;

	const diffMin = Math.floor(diffSec / 60);
	if (diffMin === 1) return '1 минуту назад';
	if (diffMin < 5) return `${diffMin} минуты назад`;
	if (diffMin < 60) return `${diffMin} минут назад`;

	const diffHour = Math.floor(diffMin / 60);
	if (diffHour === 1) return '1 час назад';
	if (diffHour < 5) return `${diffHour} часа назад`;
	if (diffHour < 24) return `${diffHour} часов назад`;

	return formatRussianDate(date.toISOString());
};

const splitByLastUnderscore = (s: string): AccountWithNumber => {
	const i = s.lastIndexOf('_');
	return i === -1 ? { base: s, num: s } : { base: s.slice(0, i), num: s.slice(i + 1) };
};

const compareAccountNumbers = (a: AccountWithNumber, b: AccountWithNumber): number => {
	const ai = Number(a.num);
	const bi = Number(b.num);
	if (!Number.isNaN(ai) && !Number.isNaN(bi)) return ai - bi;
	return a.num.localeCompare(b.num, 'ru');
};

export interface ParsedAccounts {
	successes: AccountWithNumber[];
	failures: AccountWithNumber[];
}

export const parseAccounts = (data: StandardState): ParsedAccounts => {
	const successes = data.successes.map(splitByLastUnderscore);
	const failures = data.fails.map(splitByLastUnderscore);

	successes.sort(compareAccountNumbers);
	failures.sort(compareAccountNumbers);

	return { successes, failures };
};

export const formatAccountNumbers = (accounts: AccountWithNumber[]): string => {
	return accounts.map(({ num }) => num).join(', ');
};
