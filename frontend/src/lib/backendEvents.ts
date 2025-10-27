export type BackendEventName = 'run_started' | 'decrypt_error' | 'run_finished' | 'run_failed' | (string & {}); // расширяемость

export type BackendEventPayload = Record<string, unknown>;

type EventHandler = (payload: BackendEventPayload, raw: MessageEvent) => void;
interface Status {
	connected: boolean;
	lastError?: string;
}

class BackendEventBus {
	private es: EventSource | null = null;
	private listeners = new Map<BackendEventName, Set<EventHandler>>();
	private attached = new Map<BackendEventName, (e: MessageEvent) => void>(); // на ES
	private anyListeners = new Set<(name: BackendEventName, payload: BackendEventPayload, raw: MessageEvent) => void>();
	private statusListeners = new Set<(s: Status) => void>();
	private status: Status = { connected: false };

	private ensureConnected() {
		if (this.es) return;
		this.es = new EventSource('/api/events');

		this.es.addEventListener('open', () => {
			this.setStatus({ connected: true, lastError: undefined });
		});
		this.es.addEventListener('error', (e: any) => {
			this.setStatus({ connected: false, lastError: e?.message || 'SSE error' });
		});
	}

	private setStatus(s: Status) {
		this.status = s;
		for (const cb of this.statusListeners) cb(this.status);
	}

	getStatus() {
		return this.status;
	}

	on(name: BackendEventName, handler: EventHandler): () => void {
		this.ensureConnected();

		let set = this.listeners.get(name);
		if (!set) {
			set = new Set<EventHandler>();
			this.listeners.set(name, set);
		}
		set.add(handler);

		if (!this.attached.has(name) && this.es) {
			const dispatch = (e: MessageEvent) => {
				let payload: BackendEventPayload = {};
				try {
					payload = e.data ? JSON.parse(e.data) : {};
				} catch {
					payload = { message: String(e.data ?? '') };
				}

				const list = this.listeners.get(name);
				if (list) for (const h of list) h(payload, e);

				for (const any of this.anyListeners) any(name, payload, e);
			};
			this.es.addEventListener(name, dispatch as any);
			this.attached.set(name, dispatch);
		}

		return () => {
			const set = this.listeners.get(name);
			if (!set) return;
			set.delete(handler);
			if (set.size === 0) {
				this.listeners.delete(name);

				const fn = this.attached.get(name);
				if (fn && this.es) {
					this.es.removeEventListener(name, fn as any);
					this.attached.delete(name);
				}
			}
		};
	}

	onAny(handler: (name: BackendEventName, payload: BackendEventPayload, raw: MessageEvent) => void): () => void {
		this.ensureConnected();
		this.anyListeners.add(handler);
		return () => this.anyListeners.delete(handler);
	}

	onStatus(handler: (s: Status) => void): () => void {
		handler(this.status); // мгновенно отдать текущее
		this.statusListeners.add(handler);
		return () => this.statusListeners.delete(handler);
	}
}

export const backendEventBus = new BackendEventBus();
