import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { FetchRequest } from 'ethers';
import { Logger } from './logger';
import { MissingFieldError } from './errors';
import { Proxy } from './account';

export async function setProxy(proxy?: Proxy) {
	if (!proxy?.type) throw new MissingFieldError('proxy.type');
	if (!['http', 'socks5'].includes(proxy.type)) throw new Error('Allowed proxy types: http, socks5');
	if (!proxy.ip) throw new MissingFieldError('proxy.ip');
	if (!proxy.port) throw new MissingFieldError('proxy.port');

	const auth =
		proxy.login && proxy.password ? `${encodeURIComponent(proxy.login)}:${encodeURIComponent(proxy.password)}@` : ':@';
	const scheme = proxy.type === 'socks5' ? 'socks5' : 'http';
	const proxyUrl = `${scheme}://${auth}${proxy.ip}:${proxy.port}`;

	if (proxy.type === 'http') {
		axios.defaults.httpAgent = new HttpProxyAgent(proxyUrl, { keepAlive: true });
		axios.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl, { keepAlive: true });
	} else {
		const socks = new SocksProxyAgent(proxyUrl, { keepAlive: true });
		axios.defaults.httpAgent = socks;
		axios.defaults.httpsAgent = socks;
	}
	axios.defaults.timeout = 60_000;

	const proxyAgent =
		proxy.type === 'http'
			? new HttpsProxyAgent(proxyUrl, { keepAlive: true })
			: new SocksProxyAgent(proxyUrl, { keepAlive: true });

	FetchRequest.registerGetUrl(
		FetchRequest.createGetUrlFunc({
			agent: proxyAgent,
		}),
	);

	await Logger.getInstance().log(`Proxy: ${proxyUrl}`);
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
