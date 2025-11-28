export interface AdsPowerBaseResponse {
	code: number;
	msg: string;
}

export interface AdsPowerResponse<T> extends AdsPowerBaseResponse {
	code: number;
	msg: string;
	data: T;
}
