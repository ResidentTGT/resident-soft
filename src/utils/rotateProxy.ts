import axios from 'axios';
import { Logger } from '@utils/logger';

export async function rotateProxy(url: string): Promise<void> {
	const resp = (
		await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/24.1.0.0 Safari/537.36',
			},
		})
	).data;

	if (resp.code === 200) {
		await Logger.getInstance().log(`Ip changed to ${resp.new_ip} with ${resp.rt} s.`);
	} else {
		throw new Error(`Error during changing IP: ${resp.message}`);
	}
}
