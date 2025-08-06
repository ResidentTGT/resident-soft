export interface OrderInfo {
	symbol: string;
	orderType: string;
	orderId: string;
	avgPrice: string;
	orderStatus: string;
	rejectReason: string;
	price: string;
	createdTime: string;
	positionIdx: 0;
	timeInForce: string;
	leavesValue: string;
	updatedTime: string;
	side: string;
	triggerPrice: string;
	qty: string;
	stopLoss: string;
	triggerBy: string;
	placeType: string;
}

export interface OrdersData {
	result: {
		list: OrderInfo[];
	};
}
