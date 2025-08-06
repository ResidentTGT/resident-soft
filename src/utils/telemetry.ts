import os from 'os';
import crypto from 'crypto';
import { VerifyResult, LicenseClaims } from './licenses';
import axios from 'axios';

const AMPLITUDE_API_KEY = '5f5380480ec09066068fb70913bc0d88';

function getMachineFingerprint(): string {
	const nets = os.networkInterfaces();
	const macs = Object.values(nets)
		.flatMap((iface) => iface || [])
		.filter((i) => i.mac && i.mac !== '00:00:00:00:00:00' && !i.internal)
		.map((i) => i.mac)
		.sort()
		.join('|');
	return crypto.createHash('sha256').update(macs).digest('hex');
}

export async function sendTelemetry(licenseResult: VerifyResult<LicenseClaims>) {
	const fingerprint = getMachineFingerprint();
	const licenseUser = licenseResult.ok ? licenseResult.payload.user : 'anonymous';

	const body = {
		api_key: AMPLITUDE_API_KEY,
		events: [
			{
				user_id: fingerprint,
				device_id: fingerprint,
				event_type: 'script_run',
				user_properties: {
					license_user: licenseUser,
				},
			},
		],
	};

	const headers = {
		headers: {
			'Content-Type': 'application/json',
		},
	};

	const EU_URL = 'https://api.eu.amplitude.com/2/httpapi';
	const URL = 'https://api2.amplitude.com/2/httpapi';
	let url = URL;
	while (true) {
		try {
			await axios.post(url, body, headers);
			break;
		} catch (e) {
			url = url === URL ? EU_URL : URL;
		}
	}
}
