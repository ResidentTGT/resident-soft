import { type EventName } from '../../../src/utils/server/eventName.type.ts';
import type { MessageType } from '../pages/ResultsPage/components/StateLogsTab.tsx';

export interface SSEMessage<T = unknown> {
	eventName: EventName;
	stateName?: string;
	displayName?: string;
	type?: MessageType;
	timestamp: string;
	payload?: T;
	sequence?: number;
}

type AnyHandler = (msg: SSEMessage, raw: MessageEvent) => void;
interface Status {
	connected: boolean;
	lastError?: string;
}

class BackendEventBus {
	private es: EventSource | null = null;
	private url = '/api/events';

	private byEvent = new Map<EventName, Set<AnyHandler>>();
	private anyHandlers = new Set<AnyHandler>();
	private statusHandlers = new Set<(s: Status) => void>();
	private status: Status = { connected: false };

	connect(url = this.url) {
		if (this.es) return this.es;

		this.url = url;
		this.es = new EventSource(url);

		this.es.addEventListener('open', () => {
			this.setStatus({ connected: true, lastError: undefined });
		});

		this.es.addEventListener('error', (e: any) => {
			this.setStatus({ connected: false, lastError: e?.message || 'SSE error' });
		});

		this.es.onmessage = (evt: MessageEvent) => {
			const chunks = typeof evt.data === 'string' ? evt.data.split(/\n{2,}/).filter(Boolean) : [evt.data];

			for (const chunk of chunks) {
				let msg: SSEMessage | null = null;
				try {
					msg = JSON.parse(String(chunk));
				} catch {
					continue;
				}
				if (!msg || !msg.eventName) continue;

				const set = this.byEvent.get(msg.eventName);
				if (set) for (const h of Array.from(set)) h(msg, evt);

				for (const h of Array.from(this.anyHandlers)) h(msg, evt);
			}
		};

		return this.es;
	}

	private setStatus(s: Status) {
		this.status = s;
		for (const cb of Array.from(this.statusHandlers)) cb(this.status);
	}

	getStatus() {
		return this.status;
	}

	on<E extends EventName>(name: E, handler: AnyHandler): () => void {
		this.connect();

		let set = this.byEvent.get(name);
		if (!set) {
			set = new Set<AnyHandler>();
			this.byEvent.set(name, set);
		}
		set.add(handler);

		return () => {
			const cur = this.byEvent.get(name);
			if (!cur) return;
			cur.delete(handler);
			if (cur.size === 0) this.byEvent.delete(name);
		};
	}

	onAny(handler: AnyHandler): () => void {
		this.connect();
		this.anyHandlers.add(handler);
		return () => this.anyHandlers.delete(handler);
	}

	onStatus(handler: (s: Status) => void): () => void {
		handler(this.status);
		this.statusHandlers.add(handler);
		return () => this.statusHandlers.delete(handler);
	}

	disconnect() {
		try {
			this.es?.close();
		} finally {
			this.es = null;
			this.byEvent.clear();
			this.anyHandlers.clear();
			this.setStatus({ connected: false });
		}
	}
}

export const backendEventBus = new BackendEventBus();
export type { Status };
