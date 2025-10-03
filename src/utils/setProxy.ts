import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Proxy } from '@utils/account';
import { Logger } from './logger';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { FetchRequest } from 'ethers';
import { MissingFieldError } from './errors';

export async function setProxy(proxy?: Proxy) {
	if (!proxy?.type) throw new MissingFieldError('proxy.type');

	if (!['http', 'socks5'].includes(proxy.type)) throw new Error(`Invalid proxy type: ${proxy.type}. Allowed sock5, http.`);
	if (!proxy?.ip) throw new MissingFieldError('proxy.ip');
	if (!proxy?.port) throw new MissingFieldError('proxy.port');

	const socks5Url = `socks5://${proxy.login ? encodeURIComponent(proxy.login) : ''}:${proxy.password ? encodeURIComponent(proxy.password) : ''}@${proxy.ip}:${proxy.port}`;
	const httpUrl = `http://${proxy.login ? encodeURIComponent(proxy.login) : ''}:${proxy.password ? encodeURIComponent(proxy.password) : ''}@${proxy.ip}:${proxy.port}`;

	const proxyAgent = proxy.type === 'socks5' ? new SocksProxyAgent(socks5Url) : new HttpsProxyAgent(httpUrl);

	axios.defaults.httpAgent = proxyAgent;
	axios.defaults.httpsAgent = proxyAgent;

	FetchRequest.registerGetUrl(
		FetchRequest.createGetUrlFunc({
			agent: proxyAgent,
		}),
	);

	await Logger.getInstance().log(`Proxy: ${proxy.type === 'socks5' ? socks5Url : httpUrl}`);
}

export async function resetProxy() {
	axios.defaults.httpAgent = undefined;
	axios.defaults.httpsAgent = undefined;

	FetchRequest.registerGetUrl(
		FetchRequest.createGetUrlFunc({
			agent: undefined,
		}),
	);
}
