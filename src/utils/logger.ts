// import { Bot as TelegramBot } from 'grammy';
import { delay } from './delay';
import fs from 'fs/promises';
import { broadcast } from './server/sse';
import { getCurrentTaskId } from './taskManager';

export const RED_TEXT = '\u001b[0;31m';
export const RED_BOLD_TEXT = '\u001b[1;31m';
export const GREEN_TEXT = '\u001b[0;32m';
export const YELLOW_TEXT = '\u001b[0;33m';
export const BLUE_TEXT = '\x1b[38;2;132;169;255m';
export const PURPLE_TEXT = '\u001b[0;35m';
export const CYAN_TEXT = '\u001b[0;36m';
export const RESET = '\u001b[0m';

export enum MessageType {
	Fatal,
	Error,
	Warn,
	Info,
	Notice,
	Debug,
	Trace,
}

type LogMessage = string | number | boolean | Record<string, unknown> | Error;

interface TelegramParams {
	apiKey?: string;
	chatId?: string;
}

interface LoggerConfig {
	telegramParams?: TelegramParams;
	timezone?: string;
	locale?: string;
	onTelegramError?: (error: Error, message: string) => void;
}

/**
 * Logger - Flexible singleton service for application-wide logging
 *
 * Architecture:
 * - Singleton pattern: one instance per application lifecycle
 * - Flexible configuration: can be updated at runtime via updateConfig()
 * - Multiple outputs: console, file, Telegram, SSE broadcast
 * - Thread-safe file writes via queued async operations
 *
 * Usage:
 *
 * // Option 1: Initialize with config at app start
 * Logger.getInstance({
 *   telegramParams: { apiKey: 'xxx', chatId: 'yyy' },
 *   timezone: 'Europe/Moscow',
 *   locale: 'ru-RU'
 * });
 *
 * // Option 2: Initialize without config, update later
 * Logger.getInstance();
 * Logger.getInstance().updateConfig({ telegramParams: { ... } });
 *
 * // Logging methods:
 * const logger = Logger.getInstance();
 * await logger.log('message', MessageType.Info);
 *
 * // Or use static convenience methods:
 * await Logger.info('message');
 * await Logger.error('error message');
 * await Logger.warn('warning');
 */
export class Logger {
	private static _instance: Logger | null = null;
	private telegramParams?: TelegramParams;

	private timezone: string;
	private locale: string;
	private onTelegramError?: (error: Error, message: string) => void;
	private fileWriteQueue: Promise<void> = Promise.resolve();

	private constructor(config?: LoggerConfig) {
		this.timezone = config?.timezone || 'Europe/Moscow';
		this.locale = config?.locale || 'ru-RU';
		this.onTelegramError = config?.onTelegramError;

		if (config?.telegramParams?.apiKey) {
			this.telegramParams = config.telegramParams;
			// this.telegramBot = new TelegramBot(config.telegramParams.apiKey);
		}
	}

	/**
	 * Get singleton instance. Creates instance on first call.
	 * @param config - Optional configuration (only used on first call)
	 * @returns Logger instance
	 */
	public static getInstance(config?: LoggerConfig): Logger {
		if (!Logger._instance) {
			Logger._instance = new Logger(config);
		}
		return Logger._instance;
	}

	/**
	 * Update logger configuration at runtime.
	 * Use this to change timezone, locale, or add/update Telegram integration.
	 * @param config - Partial configuration to update
	 */
	public updateConfig(config: Partial<LoggerConfig>): void {
		if (config.timezone !== undefined) this.timezone = config.timezone;
		if (config.locale !== undefined) this.locale = config.locale;
		if (config.onTelegramError !== undefined) this.onTelegramError = config.onTelegramError;

		if (config.telegramParams) {
			this.telegramParams = config.telegramParams;
			if (config.telegramParams.apiKey) {
				// this.telegramBot = new TelegramBot(config.telegramParams.apiKey);
			}
		}
	}

	public async log(message: LogMessage, type: MessageType = MessageType.Trace, logToFile = false): Promise<void> {
		const color = this._getColor(type);
		const now = new Date();
		const fulltime = new Intl.DateTimeFormat(this.locale, {
			dateStyle: 'short',
			timeStyle: 'medium',
			timeZone: this.timezone,
		}).format(now);

		const messageStr = this._formatMessage(message);
		console.log(`${color}[${fulltime}] ${messageStr} ${RESET}`);

		const currentId = getCurrentTaskId();
		if (currentId !== undefined) {
			broadcast({
				taskId: currentId,
				eventName: 'log',
				type: type,
				payload: { message: messageStr },
			});
		}

		if (type === MessageType.Error || type === MessageType.Notice) {
			await this._sendToTelegram(messageStr);
		}

		if (logToFile) {
			await this._writeLogToFile(now, messageStr);
		}
	}

	// Static convenience methods for easier usage
	public static async fatal(message: LogMessage, logToFile = false): Promise<void> {
		await Logger.getInstance().log(message, MessageType.Fatal, logToFile);
	}

	public static async error(message: LogMessage, logToFile = false): Promise<void> {
		await Logger.getInstance().log(message, MessageType.Error, logToFile);
	}

	public static async warn(message: LogMessage, logToFile = false): Promise<void> {
		await Logger.getInstance().log(message, MessageType.Warn, logToFile);
	}

	public static async info(message: LogMessage, logToFile = false): Promise<void> {
		await Logger.getInstance().log(message, MessageType.Info, logToFile);
	}

	public static async notice(message: LogMessage, logToFile = false): Promise<void> {
		await Logger.getInstance().log(message, MessageType.Notice, logToFile);
	}

	public static async debug(message: LogMessage, logToFile = false): Promise<void> {
		await Logger.getInstance().log(message, MessageType.Debug, logToFile);
	}

	public static async trace(message: LogMessage, logToFile = false): Promise<void> {
		await Logger.getInstance().log(message, MessageType.Trace, logToFile);
	}

	private async _sendToTelegram(message: string): Promise<void> {
		if (!this.telegramParams?.chatId || !this.telegramParams?.apiKey) {
			return;
		}

		let success = false;
		let attempts = 0;
		const TRIES = 5;
		let lastError: Error | null = null;

		while (!success && attempts < TRIES) {
			attempts++;
			try {
				const response = await fetch(`https://api.telegram.org/bot${this.telegramParams.apiKey}/sendMessage`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						chat_id: this.telegramParams.chatId,
						text: message.slice(0, 4090),
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`Telegram API error: ${errorText}`);
				}

				success = true;
			} catch (e) {
				lastError = e instanceof Error ? e : new Error(String(e));
				if (attempts < TRIES) {
					await delay(3);
				}
			}
		}

		if (!success && lastError) {
			console.log(`${RED_TEXT}Error during sending message to Telegram after ${TRIES} attempts${RESET}`);
			if (this.onTelegramError) {
				this.onTelegramError(lastError, message);
			}
		}
	}

	private async _writeLogToFile(date: Date, message: string): Promise<void> {
		this.fileWriteQueue = this.fileWriteQueue.then(async () => {
			try {
				const isoDate = date.toISOString();
				const time = isoDate.split('T')[1].replace('Z', '');
				const dateStr = isoDate.split('T')[0];

				await fs.mkdir('logs', { recursive: true });

				const logEntry = `[${time}] ${JSON.stringify(message)}\n`;
				await fs.appendFile(`logs/${dateStr}.txt`, logEntry, 'utf-8');
			} catch (error) {
				console.error(`${RED_TEXT}Failed to write log to file: ${error}${RESET}`);
			}
		});

		await this.fileWriteQueue;
	}

	private _formatMessage(message: LogMessage): string {
		if (message instanceof Error) {
			return `${message.name}: ${message.message}\n${message.stack || ''}`;
		}
		if (typeof message === 'object') {
			return JSON.stringify(message);
		}
		return String(message);
	}

	private _getColor(type: MessageType) {
		let color = '';

		switch (type) {
			case MessageType.Fatal:
				color = RED_BOLD_TEXT;
				break;
			case MessageType.Error:
				color = RED_TEXT;
				break;
			case MessageType.Warn:
				color = YELLOW_TEXT;
				break;
			case MessageType.Info:
				color = GREEN_TEXT;
				break;
			case MessageType.Notice:
				color = PURPLE_TEXT;
				break;
			case MessageType.Debug:
				color = CYAN_TEXT;
				break;
			case MessageType.Trace:
				color = BLUE_TEXT;
				break;
		}

		return color;
	}
}
