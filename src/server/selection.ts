import { EventEmitter } from 'events';

export type Selector = 'ui' | 'terminal';
type Choice = Selector | null;

class SelectionGate extends EventEmitter {
	private chosenBy: Choice = null;
	private frozenSnapshot: { launchParams: any; functionParams: any } | null = null;

	choose(by: Selector, snapshot?: { launchParams: any; functionParams: any }): boolean {
		if (this.chosenBy) return false; // уже выбрано
		this.chosenBy = by;
		if (snapshot) this.frozenSnapshot = snapshot; // фиксируем конфиг на момент выбора
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

	reset() {
		this.chosenBy = null;
		this.frozenSnapshot = null;
	}
}

export const selectionGate = new SelectionGate();
