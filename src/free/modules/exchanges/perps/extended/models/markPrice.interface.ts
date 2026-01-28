export interface MarkPriceData {
	m: string; // market (e.g., "BTC-USD")
	p: string; // price
	ts: number; // timestamp
}

export interface MarkPriceMessage {
	type: 'MP';
	data: MarkPriceData;
	ts: number;
	seq: number;
}
