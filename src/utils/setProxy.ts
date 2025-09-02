import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ChainId, Network } from '@utils/network';
import { Proxy } from '@utils/account';
import { Logger } from './logger';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { FetchRequest } from 'ethers';

export async function setProxy(chainId: ChainId, proxy?: Proxy) {
	if (!proxy || !proxy.ip || !proxy.port || !proxy.login || !proxy.password) throw new Error('There is no proxy!');

	const socks5Url = `socks5://${encodeURIComponent(proxy.login)}:${encodeURIComponent(proxy.password)}@${proxy.ip}:${proxy.port}`;
	const httpUrl = `http://${proxy.login}:${proxy.password}@${proxy.ip}:${proxy.port}`;

	const socks5Agent = new SocksProxyAgent(socks5Url);
	const httpAgent = new HttpsProxyAgent(httpUrl);

	try {
		axios.defaults.httpAgent = socks5Agent;
		axios.defaults.httpsAgent = socks5Agent;
		await axios.get('https://api.ipify.org?format=json');
	} catch {
		axios.defaults.httpAgent = httpAgent;
		axios.defaults.httpsAgent = httpAgent;
	}

	const isSocks5 = axios.defaults.httpAgent instanceof SocksProxyAgent;

	if (Network.isEvm(chainId)) {
		FetchRequest.registerGetUrl(
			FetchRequest.createGetUrlFunc({
				agent: isSocks5 ? socks5Agent : httpAgent,
			}),
		);
	}
	await Logger.getInstance().log(`Proxy: ${isSocks5 ? socks5Url : httpUrl}`);
}

export async function resetProxy(network: Network) {
	axios.defaults.httpAgent = undefined;
	axios.defaults.httpsAgent = undefined;
	if (Network.isEvm(network.chainId))
		FetchRequest.registerGetUrl(
			FetchRequest.createGetUrlFunc({
				agent: undefined,
			}),
		);
}
