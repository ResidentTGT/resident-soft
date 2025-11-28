// LocalAPI documentation: https://github.com/AdsPower/localAPI

import axios, { AxiosInstance } from 'axios';
import { addExtra } from 'puppeteer-extra';
import rebrowserPuppeteer from 'rebrowser-puppeteer-core';

import type { Browser, ResourceType } from 'rebrowser-puppeteer-core';
import BlockResourcesPlugin from 'puppeteer-extra-plugin-block-resources';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';

import { Profile } from './models';
import { Logger, MessageType } from '@utils/logger';
import { delay, delayMs } from '@utils/delay';
import Excel from 'exceljs';

// ------------------------------
// Environment & defaults
// ------------------------------
export const DEFAULT_LOCALAPI_URL = process.env.LOCALAPI_URL || 'http://local.adspower.net:50325/api/v1/';
export const DEFAULT_ALTERNATE_LOCALAPI_URL = process.env.ALTERNATE_LOCALAPI_URL || 'http://localhost:50325/api/v1/';

export const DEFAULT_CHROMIUM_ARGS = ['--mute-audio', '--extensions-on-chrome-urls', '--start-maximized'];

const MAX_LAUNCH_RETRIES = 10;
const LAUNCH_RETRY_DELAY_MS = 1000; // 1 s

// ------------------------------
// Error model
// ------------------------------
export class ApiError extends Error {
	public readonly code?: number;
	public readonly msg?: string;
	public readonly status?: number;

	constructor(payload: any) {
		const message = payload?.msg || payload?.message || payload?.statusText || String(payload);
		super(message);
		if (typeof payload === 'object') {
			this.code = payload.code;
			this.msg = payload.msg;
			this.status = payload.status;
		}
		Object.setPrototypeOf(this, ApiError.prototype);
	}
}

// ------------------------------
// Core class
// ------------------------------
export abstract class AdsPower {
	/** Singleton Axios instance with interceptors */
	private static readonly http: AxiosInstance = (() => {
		const instance = axios.create({
			baseURL: DEFAULT_LOCALAPI_URL,
			timeout: 300_000,
		});

		// --- unwrap business response ---
		instance.interceptors.response.use(
			(response) => {
				const body: any = response.data;
				if (body && typeof body === 'object' && 'code' in body) {
					if (body.code !== 0) {
						return Promise.reject(new ApiError(body));
					}
					return body.data;
				}
				return response.data;
			},
			(error) => {
				if (error.toString().includes('connect ECONNREFUSED 127.0.0.1:50325')) {
					error.message = 'Connection refused. Check if AdsPower is open.';
				}

				if (error.response) {
					const { status, statusText } = error.response;
					return Promise.reject(new ApiError({ status, statusText }));
				}
				return Promise.reject(error);
			},
		);

		// --- retry on rate‑limit ---
		instance.interceptors.response.use(undefined, async (error) => {
			const cfg = (error as any).config ?? {};
			const apiMsg = (error as any)?.response?.data?.msg;
			const apiErrMsg = error instanceof ApiError ? error.msg : undefined;
			const msg = apiMsg || apiErrMsg;
			if (msg === 'Too many request per second, please check') {
				await delayMs(1000);
				return instance.request(cfg);
			}
			return Promise.reject(error);
		});

		return instance;
	})();

	// ------------------------------
	// Browser
	// ------------------------------
	private static pluginsRegistered = false;

	/**
	 * Launch / connect to Puppeteer browser for a profile.
	 */
	public static async openBrowser(
		browserId: string,
		stealth = true,
		blockResources: ResourceType[] = [],
		_2captchaApiKey?: string,
		launchArgs: string[] = DEFAULT_CHROMIUM_ARGS,
	): Promise<Browser> {
		const puppeteer = addExtra(rebrowserPuppeteer as any);
		// Register plugins once
		if (!this.pluginsRegistered) {
			if (blockResources.length) {
				puppeteer.use(BlockResourcesPlugin({ blockedTypes: new Set(blockResources as any) }));
			}
			if (_2captchaApiKey) {
				puppeteer.use(RecaptchaPlugin({ provider: { id: '2captcha', token: _2captchaApiKey }, visualFeedback: true }));
			}
			this.pluginsRegistered = true;
		}

		// ---- LocalAPI start with 404‑retry ----
		let sockets: any;
		for (let attempt = 1; attempt <= MAX_LAUNCH_RETRIES; attempt++) {
			try {
				sockets = await this.http.get('browser/start', { params: { user_id: browserId } });
				break;
			} catch (err) {
				const notFound = err instanceof ApiError && err.status === 404;
				if (!notFound || attempt === MAX_LAUNCH_RETRIES) throw err;
				await delayMs(LAUNCH_RETRY_DELAY_MS);
			}
		}

		try {
			const browser = await puppeteer.connect({
				browserWSEndpoint: sockets.ws.puppeteer,
				defaultViewport: null,
				protocolTimeout: 900000,
			});

			// wait for connect (max 10 s)
			const start = Date.now();
			while (!browser.connected) {
				if (Date.now() - start > 10000) {
					throw new ApiError({ msg: 'Failed to connect to browser within 10 seconds' });
				}
				await delayMs(100);
			}
			return browser;
		} catch (e: any) {
			if (e.message?.includes('connect ECONNREFUSED 127.0.0.1'))
				throw new Error(`Couldnt connect to AdsPower profile ${browserId}. Maybe it's closing? \n${e.message}`);
			else throw e;
		}
	}

	// ------------------------------
	// Profiles
	// ------------------------------

	/** Helper: typed GET that returns plain body (already unwrapped) */
	private static async get<T = any>(url: string, params?: any): Promise<T> {
		return this.http.get<T>(url, { params }) as unknown as T;
	}

	public static async getProfiles(page = 1, pageSize = 100, groupId?: string, userId?: string): Promise<Profile[]> {
		const params: any = { page, page_size: pageSize };
		if (groupId) params.group_id = groupId;
		if (userId) params.user_id = userId;
		const { list } = await this.get<{ list: Profile[] }>('user/list', params);
		return list;
	}

	public static async getAllProfiles(totalCount: number, saveToFile = false): Promise<Profile[]> {
		const pageSize = 100;
		const pageCount = Math.ceil(totalCount / pageSize);
		const profiles: Profile[] = [];
		for (let page = 1; page <= pageCount; page++) {
			try {
				const newProfiles = await this.getProfiles(page, pageSize);
				profiles.push(...newProfiles);
			} catch (e) {
				await Logger.getInstance().log(
					`Couldnt get AdsPower profiles (page: ${page}). Trying again...\n${e}`,
					MessageType.Warn,
				);
				await delay(5);
			}
		}
		console.log(profiles.length);
		if (saveToFile && profiles.length) {
			const workbook = new Excel.Workbook();
			const sheet = workbook.addWorksheet('Profiles');
			sheet.columns = Object.keys(profiles[0]).map((key) => ({ header: key, key, width: 15 }));
			profiles.forEach((p) => sheet.addRow(p));
			sheet.getRow(1).font = { bold: true };
			await workbook.xlsx.writeFile('adspower_profiles.xlsx');
		}
		return profiles;
	}

	public static async isActiveProfile(userId: string): Promise<boolean> {
		const res = await this.get<{ status: string }>('browser/active', { user_id: userId });
		return res.status === 'Active';
	}

	public static async getProfilesUserIds(): Promise<string[]> {
		const { list } = await this.get<{ list: Profile[] }>('user/list', { page: 1, page_size: 1000 });
		list.sort((a, b) => +a.name - +b.name);
		const ids = list.map((p) => p.user_id);
		await Logger.getInstance().log(ids.join('\n'), MessageType.Trace, true);
		return ids;
	}

	public static async stopProfile(profileId: string): Promise<void> {
		await this.http.get('browser/stop', { params: { user_id: profileId } });
	}
}

// Further ideas:
// - Parameterise retry strategy via options.
// - Replace ExcelJS with CSV if only table export is needed.
// - Add Prometheus counters to interceptors for monitoring.
