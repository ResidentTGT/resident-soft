import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import fs from 'fs';
import { Logger } from '@utils/logger';
import { Exchange, UnifiedOrderbook, OrderbookChartData, ChartPoint, ArbitrageOpportunity } from './models';

const DEFAULT_COLORS = new Map<Exchange, string>([
	[Exchange.Backpack, 'rgb(255, 38, 0)'],
	[Exchange.Extended, 'rgb(0, 255, 166)'],
]);

export function toChartData(data: UnifiedOrderbook[], exchangeColors?: Map<Exchange, string>): OrderbookChartData {
	const colors = exchangeColors ?? DEFAULT_COLORS;

	const byExchange = new Map<Exchange, { bids: ChartPoint[]; asks: ChartPoint[] }>();
	const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

	for (const item of sorted) {
		let group = byExchange.get(item.exchange);
		if (!group) {
			group = { bids: [], asks: [] };
			byExchange.set(item.exchange, group);
		}
		group.bids.push({ x: item.timestamp, y: item.bestBid.price });
		group.asks.push({ x: item.timestamp, y: item.bestAsk.price });
	}

	const datasets = [];
	for (const [exchange, { bids, asks }] of byExchange) {
		const color = colors.get(exchange) || 'gray';
		const bgColor = 'rgba(67, 68, 68, 0.1)';

		datasets.push({
			label: `${exchange} Bid`,
			data: bids,
			borderColor: color,
			backgroundColor: bgColor,
			fill: '+1' as const,
		});
		datasets.push({
			label: `${exchange} Ask`,
			data: asks,
			borderColor: color,
			backgroundColor: bgColor,
			fill: false as const,
		});
	}

	return { datasets };
}

export interface RenderChartOptions {
	opportunities?: ArbitrageOpportunity[];
	width?: number;
	height?: number;
}

export async function renderChart(data: UnifiedOrderbook[], outputPath: string, options: RenderChartOptions = {}): Promise<void> {
	const { opportunities, width = 2560, height = 1440 } = options;
	const logger = Logger.getInstance();

	await logger.log(`Rendering chart with ${data.length} bids-asks...`);

	const chartData = toChartData(data);

	for (const ds of chartData.datasets) {
		await logger.log(`${ds.label}: ${ds.data.length} points`);
	}

	if (opportunities?.length) {
		await logger.log(`Adding ${opportunities.length} opportunity markers`);
	}

	// Create datasets for opportunity points connected by vertical lines
	const oppDatasets: {
		label: string;
		data: ChartPoint[];
		borderColor: string;
		backgroundColor: string;
		pointRadius: number;
		borderWidth: number;
		showLine: boolean;
	}[] = [];

	if (opportunities?.length) {
		// Each opportunity = one dataset with 2 points connected by line
		opportunities.forEach((opp, i) => {
			const color = 'rgba(0, 100, 255, 0.6)';

			oppDatasets.push({
				label: i === 0 ? 'Arbitrage' : '', // Only first one shows in legend
				data: [
					{ x: opp.timestamp, y: opp.buyPrice },
					{ x: opp.timestamp, y: opp.sellPrice },
				],
				borderColor: color,
				backgroundColor: color,
				pointRadius: 3,
				borderWidth: 2,
				showLine: true,
			});
		});
	}

	const canvas = new ChartJSNodeCanvas({
		width,
		height,
		backgroundColour: 'white',
	});

	const allDatasets = [
		...chartData.datasets.map((ds) => ({
			...ds,
			pointRadius: 2,
			borderWidth: 1,
			tension: 0,
			showLine: true,
		})),
		...oppDatasets,
	];

	const config: ChartConfiguration = {
		type: 'line',
		data: {
			datasets: allDatasets,
		},
		options: {
			responsive: false,
			animation: false,
			elements: {
				point: { radius: 2 },
				line: { borderWidth: 1 },
			},
			plugins: {
				title: {
					display: true,
					text: opportunities?.length ? `Bid-Ask Channels (${opportunities.length} opportunities)` : 'Bid-Ask Channels',
					font: { size: 16 },
				},
				legend: {
					position: 'top',
					labels: {
						filter: (item) => item.text !== '',
					},
				},
				decimation: { enabled: false },
			},
			scales: {
				x: {
					type: 'linear',
					ticks: {
						callback: (value: number | string) => {
							const date = new Date(Number(value));
							const h = date.getHours().toString().padStart(2, '0');
							const m = date.getMinutes().toString().padStart(2, '0');
							const s = date.getSeconds().toString().padStart(2, '0');
							return `${h}:${m}:${s}`;
						},
					},
					title: { display: true, text: 'Time' },
				},
				y: {
					title: { display: true, text: 'Price' },
				},
			},
		},
	};

	const buffer = await canvas.renderToBuffer(config);
	fs.writeFileSync(outputPath, buffer);

	await logger.log(`Chart saved to ${outputPath} (${width}x${height})`);
}
