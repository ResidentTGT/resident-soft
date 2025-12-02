import axios from 'axios';

import type { Browser, ResourceType } from 'rebrowser-puppeteer-core';
import BlockResourcesPlugin from 'puppeteer-extra-plugin-block-resources';

import { Logger, MessageType } from '@utils/logger';
import { delayMs } from '@utils/delay';
import puppeteer from 'puppeteer-extra';
import Excel from 'exceljs';

export interface AfinaProfile {
	accountId: string;
	name: string;
	chromiumVersion: string;
	os: string;
	proxy: string;
	language: string;
	languages: string[];
	timezone: string;
	proxyType: string;
	language_from_ip: boolean;
	languages_from_ip: boolean;
	timezone_from_ip: boolean;
	groups: string[];
	tags: string[];
}

// ------------------------------
// Constants
// ------------------------------
export const DEFAULT_BASE_URL = 'http://127.0.0.1:50777/api';

export const DEFAULT_CHROMIUM_ARGS = [
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
	//'--auto-open-devtools-for-tabs',
];

const MAX_LAUNCH_RETRIES = 10;
const LAUNCH_RETRY_DELAY_MS = 1000;

// ------------------------------
// Afina Browser API
// ------------------------------
export abstract class Afina {
	private static pluginsRegistered = false;

	/**
	 * Get all profiles
	 */
	public static async getProfiles(apiKey: string, saveToFile = false): Promise<AfinaProfile[]> {
		const profilesResp = (
			await axios.get(`${DEFAULT_BASE_URL}/profiles/list`, {
				headers: { 'x-api-key': apiKey },
			})
		).data;

		const profiles = profilesResp.accounts;

		if (saveToFile && profiles.length) {
			const workbook = new Excel.Workbook();
			const sheet = workbook.addWorksheet('Profiles');
			sheet.columns = Object.keys(profiles[0]).map((key) => ({ header: key, key, width: 15 }));
			profiles.forEach((p: any) => sheet.addRow(p));
			sheet.getRow(1).font = { bold: true };
			await workbook.xlsx.writeFile('Afina_profiles.xlsx');
		}

		return profiles;
	}

	/**
	 * Stop a profile
	 */
	public static async stopProfile(apiKey: string, profileId: string): Promise<void> {
		try {
			await axios.post(
				`${DEFAULT_BASE_URL}/profiles/stop`,
				{ profileId },
				{
					headers: { 'x-api-key': apiKey },
				},
			);
		} catch (error: any) {
			await Logger.getInstance().log(`Failed to stop profile ${profileId}: ${error.message}`, MessageType.Warn);
			throw error;
		}
	}

	/**
	 * Start a profile
	 */
	private static async startProfile(apiKey: string, profileId: string): Promise<any> {
		const response = await axios.post(
			`${DEFAULT_BASE_URL}/profiles/start`,
			{ profileId },
			{
				headers: { 'x-api-key': apiKey },
			},
		);

		return response.data;
	}

	/**
	 * Open browser and connect via Puppeteer
	 */
	public static async openBrowser(
		apiKey: string,
		profileId: string,
		blockResources: ResourceType[] = [],
		launchArgs: string[] = DEFAULT_CHROMIUM_ARGS,
	): Promise<Browser> {
		// Register plugins once
		if (!this.pluginsRegistered) {
			if (blockResources.length > 0) {
				puppeteer.use(BlockResourcesPlugin({ blockedTypes: new Set(blockResources as any) }));
			}

			this.pluginsRegistered = true;
		}

		// Start profile with retry
		let startResponse: any;
		for (let attempt = 1; attempt <= MAX_LAUNCH_RETRIES; attempt++) {
			try {
				startResponse = await this.startProfile(apiKey, profileId);
				break;
			} catch (error: any) {
				const isLastAttempt = attempt === MAX_LAUNCH_RETRIES;

				// Check for connection refused
				if (error.message?.includes('ECONNREFUSED')) {
					throw new Error(`Cannot connect to Afina API at ${DEFAULT_BASE_URL}. Ensure Afina browser is running.`);
				}

				// Check for 404 or auth errors - no point retrying
				if (error.response?.status === 404) {
					throw new Error(`Profile ${profileId} not found.`);
				}
				if (error.response?.status === 401 || error.response?.status === 403) {
					throw new Error(`Authentication failed. Check Afina API key.`);
				}

				if (isLastAttempt) {
					throw new Error(
						`Could not start Afina profile ${profileId} after ${MAX_LAUNCH_RETRIES} attempts: ${error.message}`,
					);
				}

				await Logger.getInstance().log(`Retry ${attempt} failed: ${error.message}`, MessageType.Warn);
				await delayMs(LAUNCH_RETRY_DELAY_MS);
			}
		}

		if (!startResponse) {
			throw new Error('Failed to start profile: no response received');
		}

		// Connect to browser
		try {
			const wsEndpoint = startResponse.wsEndpoint;
			if (!wsEndpoint) {
				throw new Error(`No WebSocket endpoint in response: ${JSON.stringify(startResponse)}`);
			}

			const browser = await puppeteer.connect({
				browserWSEndpoint: wsEndpoint,
				defaultViewport: null,
				protocolTimeout: 900_000,
			});

			// Wait for connection
			const connectionTimeout = 10_000;
			const startTime = Date.now();

			while (!browser.connected) {
				if (Date.now() - startTime > connectionTimeout) {
					try {
						await this.stopProfile(apiKey, profileId);
					} catch {
						// Ignore
					}
					throw new Error(`Connection timeout for profile ${profileId}`);
				}
				await delayMs(100);
			}

			return browser;
		} catch (error: any) {
			throw new Error(`Failed to connect to Afina browser: ${error.message}`);
		}
	}
}
