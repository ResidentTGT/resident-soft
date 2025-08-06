export interface BrowserSockets {
	ws: {
		selenium: string; //Browser debug interface, used for selenium automation
		puppeteer: string; //Browser debug interface, used for puppeteer automation
	};
	debug_port: string; //debug port
	webdriver: string; //webdriver path
}
