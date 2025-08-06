import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Network } from '@utils/network';
import { Proxy } from '@utils/account';
import { Logger } from './logger';

export async function setProxy(network: Network, proxy?: Proxy) {
	if (!proxy) throw new Error('There is no proxy!');
	const proxyUrl = `http://${proxy.login}:${proxy.password}@${proxy.ip}:${proxy.port}`;
	const proxyAgent = new HttpsProxyAgent(proxyUrl);
	axios.defaults.httpAgent = proxyAgent;
	axios.defaults.httpsAgent = proxyAgent;
	if (Network.isEvm(network.chainId)) network.setProxyForEthers(proxy as any);
	await Logger.getInstance().log(`Proxy: ${proxyUrl}`);
}

export async function resetProxy(network: Network) {
	axios.defaults.httpAgent = undefined;
	axios.defaults.httpsAgent = undefined;
	if (Network.isEvm(network.chainId)) network.resetProxyForEthers();
}
