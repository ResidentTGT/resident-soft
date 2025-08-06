import { HttpsProxyAgent } from 'https-proxy-agent';
import { ExchangeAccount } from './models/Account.interface';
import crypto from 'crypto';

export function getConfig(bybitAccount: ExchangeAccount, queryParams?: string, body?: object) {
	const timestamp = Date.now().toString();
	const recvWindow = '5000';

	const parameters = queryParams ?? JSON.stringify(body);

	const forSign = timestamp + bybitAccount.apiKey + recvWindow + parameters;
	const sign = crypto.createHmac('sha256', bybitAccount.apiSecret).update(forSign).digest('hex');

	const config = {
		headers: {
			'X-BAPI-SIGN-TYPE': '2',
			'X-BAPI-API-KEY': bybitAccount.apiKey,
			'X-BAPI-SIGN': sign,
			'X-BAPI-TIMESTAMP': timestamp,
			'X-BAPI-RECV-WINDOW': recvWindow,
			'Content-Type': 'application/json; charset=utf-8',
		},
		httpsAgent: new HttpsProxyAgent(
			`http://${bybitAccount.proxy.login}:${bybitAccount.proxy.password}@${bybitAccount.proxy.host}:${bybitAccount.proxy.port}`,
		),
	};

	return config;
}
