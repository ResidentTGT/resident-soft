export interface JobAccount {
	file: string;
	start: number;
	end: number;
	include: string[] | number[];
	exclude: string[] | number[];
}
