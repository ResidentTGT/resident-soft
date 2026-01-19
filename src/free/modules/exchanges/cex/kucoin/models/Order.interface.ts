export interface Order {
	id: string; //orderid
	symbol: string; //symbol
	type: string; // order type,e.g. limit,market,stop_limit.
	side: string; // transaction direction,include buy and sell
	price: string; // order price
	size: string; // order quantity
	isActive: boolean;
	cancelExist: boolean;
}
