export interface ChartPoint {
	x: number; // timestamp
	y: number; // price
}

export interface ChartDataset {
	label: string;
	data: ChartPoint[];
	borderColor: string;
	backgroundColor: string;
	fill: boolean | string; // false or '+1' for area between lines
}

export interface OrderbookChartData {
	datasets: ChartDataset[];
}
