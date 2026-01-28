export interface TickerData {
	e: string; // event type
	E: number; // event time
	s: string; // symbol
	c: string; // last price
	h: string; // high price
	l: string; // low price
	n: number; // number of trades
	o: string; // open price
	v: string; //
	V: string; //
}

export interface TickerMessage {
	stream: string;
	data: TickerData;
}
