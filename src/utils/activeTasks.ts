/**
 * Lightweight tracker for active tasks
 * Uses stateName as task ID
 */
class ActiveTasksTracker {
	private activeTasks = new Set<string>(); // Set of active stateNames
	private cancelSignals = new Map<string, AbortController>();

	/**
	 * Register a new active task
	 */
	registerTask(stateName: string): AbortController {
		this.activeTasks.add(stateName);

		const cancelSignal = new AbortController();
		this.cancelSignals.set(stateName, cancelSignal);

		return cancelSignal;
	}

	/**
	 * Unregister completed/failed task
	 */
	unregisterTask(stateName: string): void {
		this.activeTasks.delete(stateName);
		this.cancelSignals.delete(stateName);
	}

	/**
	 * Check if task is active
	 */
	isActive(stateName: string): boolean {
		return this.activeTasks.has(stateName);
	}

	/**
	 * Get all active task names
	 */
	getActiveTasks(): string[] {
		return Array.from(this.activeTasks);
	}

	/**
	 * Get cancel signal for task
	 */
	getCancelSignal(stateName: string): AbortController | undefined {
		return this.cancelSignals.get(stateName);
	}

	/**
	 * Cancel task by stateName
	 */
	cancelTask(stateName: string): boolean {
		const signal = this.cancelSignals.get(stateName);
		if (!signal || signal.signal.aborted) {
			return false;
		}

		signal.abort();
		return true;
	}

	/**
	 * Check if task is cancelled
	 */
	isCancelled(stateName: string): boolean {
		const signal = this.cancelSignals.get(stateName);
		return signal?.signal.aborted ?? false;
	}

	/**
	 * Get count of active tasks
	 */
	getActiveCount(): number {
		return this.activeTasks.size;
	}
}

export const activeTasksTracker = new ActiveTasksTracker();
