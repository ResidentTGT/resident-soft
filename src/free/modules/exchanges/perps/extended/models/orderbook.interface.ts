export interface Orderbook {
	ts: number; // Timestamp (in epoch milliseconds) when the system generated the data.
	type: string; // Type of message. Can be SNAPSHOT or DELTA
	data: {
		t: string; // Type of message. Can be SNAPSHOT or DELTA
		m: string; // market
		d: string; // depth
		b: OrderbookQuote[]; // List of bid orders. For a snapshot, bids are sorted by price in descending order.
		a: OrderbookQuote[]; // List of ask orders. For a snapshot, asks are sorted by price in ascending order.
	};
	seq: number;
}

export interface OrderbookQuote {
	p: string; // price
	q: string; // size
}
