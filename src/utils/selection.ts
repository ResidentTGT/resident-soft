import { EventEmitter } from 'events';
import { type LaunchParams } from './types/launchParams.type';
import { type FunctionParams } from './types/functionParams.type';

export type Selector = 'ui' | 'terminal';

type Choice = Selector | null;

interface ConfigsSnapshot {
	launchParams: LaunchParams;
	functionParams: FunctionParams;
}

export interface RunRequest {
	by: Selector;
	snapshot?: ConfigsSnapshot | null;
	key?: string;
}

interface SelectionStatus {
	chosenBy: Choice;
	chosenAt: string | null;
	locked: boolean; // true if chosen at least once during current process lifetime
}

class SelectionGate extends EventEmitter {
	private lastEvent?: RunRequest;
	private chosenBy: Choice = null;
	private chosenAt: string | null = null;

	choose(by: Selector, snapshot?: ConfigsSnapshot, key?: string): boolean {
		const evt: RunRequest = { by, snapshot: snapshot ?? null, key };
		this.lastEvent = evt;
		if (!this.chosenBy) {
			this.chosenBy = by;
			this.chosenAt = new Date().toISOString();
		}
		this.emit('run', evt);
		return true;
	}

	waitForChoice(): Promise<Selector> {
		return new Promise<Selector>((resolve) => {
			const handler = (evt: RunRequest) => {
				this.off('run', handler);
				resolve(evt.by);
			};
			this.on('run', handler);
		});
	}

	getSnapshot() {
		return this.lastEvent?.snapshot ?? null;
	}
	getUiKey() {
		return this.lastEvent?.key;
	}

	getStatus(): SelectionStatus {
		return {
			chosenBy: this.chosenBy,
			chosenAt: this.chosenAt,
			locked: this.chosenBy !== null,
		};
	}

	reset() {
		this.lastEvent = undefined;
		this.chosenBy = null;
		this.chosenAt = null;
	}
}

export const selectionGate = new SelectionGate();
