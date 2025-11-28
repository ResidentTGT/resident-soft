// see sources: https://docs.browser.vision/api-reference/

import axios from 'axios';
import { Browser, ResourceType } from 'rebrowser-puppeteer-core';
import puppeteer from 'puppeteer-extra';
import BlockResourcesPlugin from 'puppeteer-extra-plugin-block-resources';
import { delay, delayMs } from '../../delay';
import { Logger, MessageType } from '../../logger';
import Excel from 'exceljs';

export const DEFAULT_LOCALAPI_URL = 'http://127.0.0.1:3030/';
export const GLOBAL_API_URL = 'https://v1.empr.cloud/api/v1/';

const MAX_LAUNCH_RETRIES = 10;
const LAUNCH_RETRY_DELAY_MS = 1000; // 1 s

interface VisionProfile {
	owner: string;
	id: string;
	folder_id: string;
	proxy_id: string;
	profile_name: string;
	profile_notes: string;
	profile_status: string[];
	profile_tags: string[];
	browser: string;
	platform: string;
	running: boolean;
	pinned: boolean;
	worktime: number;
	last_run_at: string;
	created_at: string;
	updated_at: string;
	recovered: number;
	is_received: boolean;
	app_version: string;
	proxy: string;
}

interface StartProfileResponse {
	folder_id: string;
	profile_id: string;
	port: number;
}

export const DEFAULT_CHROMIUM_ARGS = [
	// '--ipc-server=1',
	// '--ipc-client=1',

	// audio
	//'--mute-audio',
	// access to extendion:// tabs
	// '--extensions-on-chrome-urls',
	// allow background work for tabs
	// '--disable-background-timer-throttling',
	'--disable-backgrounding-occluded-windows',
	'--disable-renderer-backgrounding',

	// maximize windows
	// '--start-maximized',
	'--window-position=0,0',
	'--window-size=1920,1080',
	//'--auto-open-devtools-for-tabs',
];

export abstract class Vision {
	public static async getProfiles(token: string, folderId: string, saveToFile = false): Promise<VisionProfile[]> {
		const ps = 500;
		const profiles = [];
		let page = 0;
		while (true) {
			try {
				const profilesResp = (
					await axios.get(GLOBAL_API_URL + `folders/${folderId}/profiles?pn=${page}&ps=${ps}`, {
						headers: {
							'X-Token': token,
						},
					})
				).data;

				profiles.push(...profilesResp.data.items);

				if (profilesResp.data.items.length < ps) {
					break;
				} else {
					page++;
				}
			} catch (e) {
				await Logger.getInstance().log(`Couldnt get Vision profiles.\n${e}`, MessageType.Warn);
				await delay(5);
			}
		}

		if (saveToFile && profiles.length) {
			const workbook = new Excel.Workbook();
			const sheet = workbook.addWorksheet('Profiles');
			sheet.columns = Object.keys(profiles[0]).map((key) => ({ header: key, key, width: 15 }));
			profiles.forEach((p) => sheet.addRow(p));
			sheet.getRow(1).font = { bold: true };
			await workbook.xlsx.writeFile('vision_profiles.xlsx');
		}

		return profiles;
	}

	public static async openBrowser(
		token: string,
		folderId: string,
		profileId: string,
		blockResources: ResourceType[] = [],
		_2captchaApiKey?: string,
		launchArgs: string[] = DEFAULT_CHROMIUM_ARGS,
	): Promise<Browser> {
		if (blockResources.length)
			puppeteer.use(
				BlockResourcesPlugin({
					blockedTypes: new Set(blockResources as any),
				}),
			);

		let profile: any;
		for (let attempt = 1; attempt <= MAX_LAUNCH_RETRIES; attempt++) {
			try {
				profile = await this.startProfile(token, folderId, profileId, launchArgs);
				break;
			} catch (e: any) {
				if (e.message?.includes('connect ECONNREFUSED 127.0.0.1'))
					throw new Error(`Couldnt start Vision profile ${profileId}. Maybe Vision browser is closed? \n${e.message}`);
				await delayMs(LAUNCH_RETRY_DELAY_MS);
			}
		}
		if (!profile) throw new Error('Couldnt start profile');

		for (let attempt = 1; attempt <= MAX_LAUNCH_RETRIES; attempt++) {
			for (let attempt = 1; attempt <= MAX_LAUNCH_RETRIES; attempt++) {
				try {
					const browser = await puppeteer.connect({
						browserURL: `http://127.0.0.1:${profile.port}`,
						defaultViewport: null,
						protocolTimeout: 60_000,
					});

					// const start = Date.now();
					// while (
					// 	typeof (browser as any).isConnected === 'function'
					// 		? !(browser as any).isConnected()
					// 		: !(browser as any).connected
					// ) {
					// 	if (Date.now() - start > 10_000) {
					// 		throw new Error('Failed to connect to browser within 10 seconds');
					// 	}
					// 	await delayMs(100);
					// }

					return browser;
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					const isLast = attempt === MAX_LAUNCH_RETRIES;

					if (isLast) {
						if (msg.includes('connect ECONNREFUSED 127.0.0.1')) {
							throw new Error(`Couldn’t connect to Vision profile ${profileId}. Maybe it's closing?\n${msg}`);
						}

						throw err instanceof Error ? err : new Error(msg);
					}

					await delayMs(LAUNCH_RETRY_DELAY_MS);
				}
			}
		}
		throw new Error(`Exhausted ${MAX_LAUNCH_RETRIES} attempts without connecting`);
	}

	public static async startProfile(
		token: string,
		folderId: string,
		profileId: string,
		launchArgs: string[],
	): Promise<StartProfileResponse> {
		const body = {
			args: launchArgs,
		};
		const url = DEFAULT_LOCALAPI_URL + `start/${folderId}/${profileId}`;

		const profile = (
			await axios.post(url, body, {
				headers: {
					'X-Token': token,
					'Content-Type': 'application/json',
				},
			})
		).data;

		return profile;
	}

	public static async stopProfile(folderId: string, profileId: string): Promise<void> {
		const url = DEFAULT_LOCALAPI_URL + `stop/${folderId}/${profileId}`;

		await axios.get(url, {});
	}
}
