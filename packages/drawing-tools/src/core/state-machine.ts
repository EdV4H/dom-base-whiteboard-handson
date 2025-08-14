/**
 * Lightweight state machine implementation for tool system
 */

export type StateDefinition<TState extends string, TEvent extends { type: string }> = {
	on?: {
		[K in TEvent["type"]]?:
			| TState
			| {
					target: TState;
					cond?: (event: Extract<TEvent, { type: K }>) => boolean;
					action?: (event: Extract<TEvent, { type: K }>) => void;
			  };
	};
	entry?: () => void;
	exit?: () => void;
};

export type MachineConfig<TState extends string, TEvent extends { type: string }> = {
	id: string;
	initial: TState;
	states: Record<TState, StateDefinition<TState, TEvent>>;
};

export type StateMachine<TState extends string, TEvent extends { type: string }> = {
	readonly state: TState;
	send: (event: TEvent) => void;
	matches: (state: TState) => boolean;
	subscribe: (listener: (state: TState) => void) => () => void;
	start: () => void;
	stop: () => void;
};

/**
 * Creates a lightweight state machine
 */
export const createMachine = <TState extends string, TEvent extends { type: string }>(
	config: MachineConfig<TState, TEvent>,
): StateMachine<TState, TEvent> => {
	let currentState = config.initial;
	let listeners: Array<(state: TState) => void> = [];
	let isStarted = false;

	const notifyListeners = () => {
		listeners.forEach((listener) => listener(currentState));
	};

	const transitionTo = (nextState: TState) => {
		if (nextState === currentState) return;

		// Exit current state
		const currentStateConfig = config.states[currentState];
		currentStateConfig.exit?.();

		// Transition
		currentState = nextState;

		// Enter new state
		const nextStateConfig = config.states[currentState];
		nextStateConfig.entry?.();

		// Notify listeners
		notifyListeners();
	};

	const machine: StateMachine<TState, TEvent> = {
		get state() {
			return currentState;
		},

		send(event: TEvent) {
			if (!isStarted) {
				console.warn(`[${config.id}] State machine not started`);
				return;
			}

			const stateConfig = config.states[currentState];
			const transition = stateConfig.on?.[event.type];

			if (!transition) return;

			if (typeof transition === "string") {
				transitionTo(transition);
			} else {
				// Check condition
				if (transition.cond && !transition.cond(event as any)) {
					return;
				}

				// Execute action
				transition.action?.(event as any);

				// Transition to target state
				transitionTo(transition.target);
			}
		},

		matches(state: TState) {
			return currentState === state;
		},

		subscribe(listener: (state: TState) => void) {
			listeners.push(listener);
			// Immediately call listener with current state
			listener(currentState);

			// Return unsubscribe function
			return () => {
				listeners = listeners.filter((l) => l !== listener);
			};
		},

		start() {
			if (isStarted) return;

			isStarted = true;

			// Enter initial state
			const initialStateConfig = config.states[currentState];
			initialStateConfig.entry?.();

			notifyListeners();
		},

		stop() {
			if (!isStarted) return;

			// Exit current state
			const currentStateConfig = config.states[currentState];
			currentStateConfig.exit?.();

			isStarted = false;
			listeners = [];
		},
	};

	return machine;
};
