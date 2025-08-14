import { describe, expect, it, vi } from "vitest";
import { createMachine } from "../state-machine";

describe("State Machine", () => {
	type TestState = "idle" | "active" | "completed";
	type TestEvent = { type: "START" } | { type: "FINISH" } | { type: "RESET" };

	it("should create a state machine with initial state", () => {
		const machine = createMachine<TestState, TestEvent>({
			id: "test",
			initial: "idle",
			states: {
				idle: {},
				active: {},
				completed: {},
			},
		});

		expect(machine.state).toBe("idle");
		expect(machine.matches("idle")).toBe(true);
		expect(machine.matches("active")).toBe(false);
	});

	it("should transition between states", () => {
		const machine = createMachine<TestState, TestEvent>({
			id: "test",
			initial: "idle",
			states: {
				idle: {
					on: {
						START: "active",
					},
				},
				active: {
					on: {
						FINISH: "completed",
					},
				},
				completed: {
					on: {
						RESET: "idle",
					},
				},
			},
		});

		machine.start();

		expect(machine.state).toBe("idle");

		machine.send({ type: "START" });
		expect(machine.state).toBe("active");

		machine.send({ type: "FINISH" });
		expect(machine.state).toBe("completed");

		machine.send({ type: "RESET" });
		expect(machine.state).toBe("idle");
	});

	it("should execute entry and exit actions", () => {
		const entryMock = vi.fn();
		const exitMock = vi.fn();

		const machine = createMachine<TestState, TestEvent>({
			id: "test",
			initial: "idle",
			states: {
				idle: {
					on: {
						START: "active",
					},
				},
				active: {
					entry: entryMock,
					exit: exitMock,
					on: {
						FINISH: "completed",
					},
				},
				completed: {},
			},
		});

		machine.start();

		machine.send({ type: "START" });
		expect(entryMock).toHaveBeenCalledTimes(1);

		machine.send({ type: "FINISH" });
		expect(exitMock).toHaveBeenCalledTimes(1);
	});

	it("should handle conditional transitions", () => {
		const machine = createMachine<TestState, TestEvent>({
			id: "test",
			initial: "idle",
			states: {
				idle: {
					on: {
						START: {
							target: "active",
							cond: () => true,
						},
					},
				},
				active: {
					on: {
						FINISH: {
							target: "completed",
							cond: () => false,
						},
					},
				},
				completed: {},
			},
		});

		machine.start();

		machine.send({ type: "START" });
		expect(machine.state).toBe("active"); // Condition is true

		machine.send({ type: "FINISH" });
		expect(machine.state).toBe("active"); // Condition is false, no transition
	});

	it("should execute transition actions", () => {
		const actionMock = vi.fn();

		const machine = createMachine<TestState, TestEvent>({
			id: "test",
			initial: "idle",
			states: {
				idle: {
					on: {
						START: {
							target: "active",
							action: actionMock,
						},
					},
				},
				active: {},
				completed: {},
			},
		});

		machine.start();

		machine.send({ type: "START" });
		expect(actionMock).toHaveBeenCalledWith({ type: "START" });
	});

	it("should notify subscribers on state changes", () => {
		const listenerMock = vi.fn();

		const machine = createMachine<TestState, TestEvent>({
			id: "test",
			initial: "idle",
			states: {
				idle: {
					on: {
						START: "active",
					},
				},
				active: {},
				completed: {},
			},
		});

		const unsubscribe = machine.subscribe(listenerMock);

		machine.start();
		// Subscribe immediately calls listener, then start calls it again
		expect(listenerMock).toHaveBeenCalledWith("idle");
		expect(listenerMock).toHaveBeenCalledTimes(2);

		machine.send({ type: "START" });
		expect(listenerMock).toHaveBeenCalledWith("active");
		expect(listenerMock).toHaveBeenCalledTimes(3);

		unsubscribe();

		machine.send({ type: "START" });
		expect(listenerMock).toHaveBeenCalledTimes(3); // No new calls after unsubscribe
	});

	it("should not transition when machine is not started", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const machine = createMachine<TestState, TestEvent>({
			id: "test",
			initial: "idle",
			states: {
				idle: {
					on: {
						START: "active",
					},
				},
				active: {},
				completed: {},
			},
		});

		machine.send({ type: "START" });
		expect(machine.state).toBe("idle");
		expect(consoleSpy).toHaveBeenCalledWith("[test] State machine not started");

		consoleSpy.mockRestore();
	});

	it("should handle stop correctly", () => {
		const exitMock = vi.fn();

		const machine = createMachine<TestState, TestEvent>({
			id: "test",
			initial: "idle",
			states: {
				idle: {
					exit: exitMock,
					on: {
						START: "active",
					},
				},
				active: {},
				completed: {},
			},
		});

		machine.start();
		machine.stop();

		expect(exitMock).toHaveBeenCalledTimes(1);

		// Should not transition after stop
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		machine.send({ type: "START" });
		expect(machine.state).toBe("idle");

		consoleSpy.mockRestore();
	});
});
