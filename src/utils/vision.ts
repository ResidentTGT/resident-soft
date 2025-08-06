// see sources: https://docs.browser.vision/api-reference/

import axios from 'axios';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import BlockResourcesPlugin from 'puppeteer-extra-plugin-block-resources';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { delay } from './delay';

export const DEFAULT_LOCALAPI_URL = 'http://127.0.0.1:3030/';
export const GLOBAL_API_URL = 'https://v1.empr.cloud/api/v1/';

export const DEFAULT_CHROMIUM_ARGS = [
	// graphical optimization
	// '--wm-window-animations-disabled',
	// '--animation-duration-scale=0',
	// '--blink-settings=imageAnimationPolicy=2', // disable gif animation
	// '--ignore-gpu-blacklist',
	// '--enable-gpu-rasterization',
	// '--enable-native-gpu-memory-buffers',
	// audio
	//'--mute-audio',
	// access to extendion:// tabs
	//'--silent-debugger-extension-api',
	//'--extensions-on-chrome-urls',
	// allow background work for tabs
	/*
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    */
	//'--disable-blink-features',
	// maximize windows
	//'--start-maximized',
	// '--window-position=0,0',
	//'--auto-open-devtools-for-tabs',
];

export abstract class Vision {
	public static async getProfiles(token: string, folderId: string): Promise<any> {
		// let args = `?page=${page || 1}`;
		// if (pageSize) args += `&page_size=${pageSize}`;
		// if (groupId) args += `&group_id=${groupId}`;
		// if (userId) args += `&user_id=${userId}`;

		const profiles = await axios.get(GLOBAL_API_URL + `folders/${folderId}/profiles`, {
			headers: {
				'X-Token': token,
			},
		});

		return profiles.data.data.items;
	}

	public static async openBrowser(
		token: string,
		folderId: string,
		profileId: string,
		stealth = true,
		blockResources: (
			| 'image'
			| 'font'
			| 'document'
			| 'stylesheet'
			| 'media'
			| 'script'
			| 'texttrack'
			| 'xhr'
			| 'fetch'
			| 'prefetch'
			| 'eventsource'
			| 'websocket'
			| 'manifest'
			| 'signedexchange'
			| 'ping'
			| 'cspviolationreport'
			| 'preflight'
			| 'other'
		)[] = [],
		_2captchaApiKey?: string,
		launchArgs: string[] = DEFAULT_CHROMIUM_ARGS,
	): Promise<Browser> {
		if (stealth) {
			const stealthPlugin = StealthPlugin();
			stealthPlugin.enabledEvasions.delete('iframe.contentWindow');
			stealthPlugin.enabledEvasions.delete('media.codecs');
			puppeteer.use(stealthPlugin);
		}

		if (blockResources.length)
			puppeteer.use(
				BlockResourcesPlugin({
					blockedTypes: new Set(blockResources),
				}),
			);
		if (_2captchaApiKey)
			puppeteer.use(
				RecaptchaPlugin({
					provider: {
						id: '2captcha',
						token: _2captchaApiKey,
					},
					visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
				}),
			);
		const profile = await this.startProfile(token, folderId, profileId, launchArgs);
		console.log(profile);
		await delay(100);
		const browser = await puppeteer.connect({
			browserURL: `http://127.0.0.1:${profile.port}`,
			//ignoreHTTPSErrors: true,
			defaultViewport: null,
			protocolTimeout: 900_000,
		});

		// let connected;
		// while (!connected) {
		// 	connected = browser.connected;
		// 	await delayMs(100);
		// }

		return browser;
	}

	public static async startProfile(token: string, folderId: string, profileId: string, launchArgs: string[]): Promise<any> {
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
}
