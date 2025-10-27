import { useEffect } from 'react';
import { backendEventBus, type BackendEventName, type BackendEventPayload } from '../lib/backendEvents';

type HandlerMap = Partial<Record<BackendEventName, (payload: BackendEventPayload) => void>>;

export function useBackendEvents(handlers: HandlerMap) {
	useEffect(() => {
		const unsubs: (() => void)[] = [];
		for (const [name, fn] of Object.entries(handlers) as [BackendEventName, (p: BackendEventPayload) => void][]) {
			if (typeof fn === 'function') {
				unsubs.push(backendEventBus.on(name, (payload) => fn(payload)));
			}
		}
		return () => {
			unsubs.forEach((u) => u());
		};
	}, [JSON.stringify(Object.keys(handlers))]);
}

export function useBackendConnection(onStatus: (s: { connected: boolean; lastError?: string }) => void) {
	useEffect(() => backendEventBus.onStatus(onStatus), [onStatus]);
}

export function useBackendAny(onAny: (name: BackendEventName, payload: BackendEventPayload) => void) {
	useEffect(() => backendEventBus.onAny((n, p) => onAny(n, p)), [onAny]);
}
