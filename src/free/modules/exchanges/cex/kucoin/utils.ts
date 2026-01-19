import { HttpsProxyAgent } from 'https-proxy-agent';
import { ExchangeAccount } from '../bybit/models/Account.interface';

import crypto from 'crypto';

export function getConfig(
	account: ExchangeAccount,
	method: 'GET' | 'POST' | 'DELETE' | 'PUT',
	path: string,
	queryParams?: string,
	body?: object,
) {
	const timestamp = Date.now().toString();

	let parameters = '';
	if (queryParams) {
		parameters = `?${queryParams}`;
	} else if (body) {
		parameters = JSON.stringify(body);
	}

	const forSign = timestamp + method + path + parameters;
	const sign = crypto.createHmac('sha256', account.apiSecret).update(forSign).digest('base64');

	const passphrase = crypto
		.createHmac('sha256', account.apiSecret)
		.update(account.kucoinPassphrase ?? '')
		.digest('base64');

	const config = {
		headers: {
			'KC-API-SIGN': sign,
			'KC-API-TIMESTAMP': timestamp,
			'KC-API-KEY': account.apiKey,
			'KC-API-PASSPHRASE': passphrase,
			'KC-API-KEY-VERSION': '2',
			'Content-Type': 'application/json',
		},
		httpsAgent: new HttpsProxyAgent(
			`http://${account.proxy.login}:${account.proxy.password}@${account.proxy.host}:${account.proxy.port}`,
		),
	};

	return config;
}
