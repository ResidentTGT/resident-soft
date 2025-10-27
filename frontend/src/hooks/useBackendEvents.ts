import { useEffect } from 'react';
import { backendEventBus, type SSEMessage, type Status } from '../lib/backendEvents';
import { type EventName } from '../../../src/utils/server/eventName.type.ts';

type HandlerMap = Partial<Record<EventName, (msg: SSEMessage) => void>>;

export function useBackendEvents(handlers: HandlerMap) {
	useEffect(() => {
		const unsubs: (() => void)[] = [];

		(Object.entries(handlers) as [EventName, (m: SSEMessage) => void][]).forEach(([name, fn]) => {
			if (typeof fn !== 'function') return;
			unsubs.push(backendEventBus.on(name, (msg) => fn(msg)));
		});

		return () => {
			unsubs.forEach((u) => u());
		};
	}, [JSON.stringify(Object.keys(handlers).sort())]);
}

export function useBackendConnection(onStatus: (s: Status) => void) {
	useEffect(() => backendEventBus.onStatus(onStatus), [onStatus]);
}

export function useBackendAny(onAny: (msg: SSEMessage) => void) {
	useEffect(() => backendEventBus.onAny((m) => onAny(m)), [onAny]);
}
