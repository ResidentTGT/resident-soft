import { AdsPowerBaseResponse } from './adsPowerResponse';

export class HttpError<Data> {
	public response: Data;

	constructor(response: Data) {
		this.response = response;
	}
}

export class AdsError<Data extends AdsPowerBaseResponse> {
	public response: Data;

	constructor(response: Data) {
		this.response = response;
	}
}
