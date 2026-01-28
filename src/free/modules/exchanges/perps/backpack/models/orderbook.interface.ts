export interface BookTickerData {
	s: string; // symbol
	a: string; // best ask price
	A: string; // best ask quantity
	b: string; // best bid price
	B: string; // best bid quantity
	E: number; // event time (microseconds)
	T: number; // Engine timestamp in microseconds
	e: string; // Event type
	u: number; // Update ID of event
}

export interface BookTickerMessage {
	stream: string;
	data: BookTickerData;
}
