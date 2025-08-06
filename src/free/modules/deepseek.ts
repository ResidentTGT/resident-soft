import axios from 'axios';

interface DeepSeekAPIRequest {
	model: string;
	messages: { role: string; content: string }[];
	temperature?: number;
}

interface DeepSeekAPIResponse {
	choices: {
		message: {
			content: string;
		};
	}[];
}

export class Deepseek {
	public static readonly BASE_URL = 'https://api.deepseek.com/';

	private _apiKey: string;

	constructor(apiKey: string) {
		this._apiKey = apiKey;
	}

	public async request(message: string): Promise<DeepSeekAPIResponse> {
		const requestBody: DeepSeekAPIRequest = {
			model: 'deepseek-chat',
			messages: [
				{
					role: 'user',
					content: message,
				},
			],
			temperature: 1.5,
			// Coding / Math 0.0
			// Data Cleaning / Data Analysis	1.0
			// General Conversation	1.3
			// Translation	1.3
			// Creative Writing / Poetry	1.5
		};

		const response = await axios.post(Deepseek.BASE_URL + 'v1/chat/completions', requestBody, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this._apiKey}`,
			},
		});

		const data: DeepSeekAPIResponse = response.data;

		return data;
	}

	public async getUser() {
		const response = await axios.get(Deepseek.BASE_URL + 'user/balance', {
			headers: {
				Authorization: `Bearer ${this._apiKey}`,
			},
		});

		console.log(response);

		return response;
	}
}
