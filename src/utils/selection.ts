import { EventEmitter } from 'events';
import { type LaunchParams } from './types/launchParams.type';
import { type FunctionParams } from './types/functionParams.type';

export type Selector = 'ui' | 'terminal';
type Choice = Selector | null;
interface ConfigsSnapshot {
	launchParams: LaunchParams;
	functionParams: FunctionParams;
}

class SelectionGate extends EventEmitter {
	private chosenBy: Choice = null;
	private frozenSnapshot: ConfigsSnapshot | null = null;
	private uiKey?: string;

	choose(by: Selector, snapshot?: ConfigsSnapshot, key?: string): boolean {
		if (this.chosenBy) return false;
		this.chosenBy = by;
		if (snapshot) this.frozenSnapshot = snapshot;
		this.uiKey = by === 'ui' && typeof key === 'string' && key.length > 0 ? key : undefined;
		this.emit('chosen', by);
		return true;
	}

	waitForChoice(): Promise<Selector> {
		if (this.chosenBy) return Promise.resolve(this.chosenBy);
		return new Promise<Selector>((resolve) => this.once('chosen', resolve));
	}

	getStatus() {
		return { chosenBy: this.chosenBy, frozen: Boolean(this.frozenSnapshot) };
	}

	getSnapshot() {
		return this.frozenSnapshot;
	}

	getUiKey() {
		return this.uiKey;
	}

	reset() {
		this.chosenBy = null;
		this.frozenSnapshot = null;
		this.uiKey = undefined;
	}
}

export const selectionGate = new SelectionGate();
