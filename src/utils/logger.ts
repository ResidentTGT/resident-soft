import { Bot as TelegramBot } from 'grammy';
import { delay } from './delay';
import fs from 'fs';

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

interface TelegramParams {
	apiKey?: string;
	chatId?: string;
}

export class Logger {
	private static _instance: Logger | null = null;
	private telegramParams?: TelegramParams;
	private telegramBot?: TelegramBot;

	private constructor(telegramParams?: TelegramParams) {
		if (telegramParams && telegramParams.apiKey) {
			this.telegramParams = telegramParams;
			if (this.telegramParams.apiKey) this.telegramBot = new TelegramBot(this.telegramParams.apiKey);
		}
	}

	public static getInstance(telegramParams?: TelegramParams): Logger {
		if (!Logger._instance) {
			Logger._instance = new Logger(telegramParams);
		}
		return Logger._instance;
	}

	public async log(message: any, type: MessageType = MessageType.Trace, logToFile = false): Promise<void> {
		const color = this._getColor(type);
		const fulldate = new Date().toISOString().replace('Z', '');
		const fulltime = new Intl.DateTimeFormat('ru-RU', {
			dateStyle: 'short',
			timeStyle: 'medium',
			timeZone: 'Europe/Moscow',
		}).format(new Date());

		console.log(`${color}[${fulltime}] ${message} ${RESET}`);

		if (type === MessageType.Error || type === MessageType.Notice) {
			if (this.telegramParams?.chatId && this.telegramBot) {
				let success;
				let attempts = 0;
				const TRIES = 5;
				while (!success && attempts < TRIES) {
					attempts++;
					try {
						await this.telegramBot.api.sendMessage(this.telegramParams.chatId, message.toString().slice(0, 4090));
						success = true;
					} catch (e) {
						if (attempts < TRIES) {
							await delay(3);
						} else {
							console.log(`Error during sending message to Telegram with ${TRIES} attempts: ${e}`);
							break;
						}
					}
				}
			}
		}

		if (logToFile) this._writeLogToFile(fulldate, message);
	}

	private _writeLogToFile(fulldate: string, message: string) {
		const time = fulldate.split('T')[1];
		const date = fulldate.split('T')[0];

		if (!fs.existsSync('logs')) fs.mkdirSync('logs');

		const stream = fs.createWriteStream(`logs/${date}.txt`, { flags: 'a' });
		stream.write(`[${time}] ${JSON.stringify(message)}\n`);
		stream.end();
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
