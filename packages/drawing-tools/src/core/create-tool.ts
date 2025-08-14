import type { Point } from "@usketch/shared-types";
import type { Tool, ToolDefinition, ToolEvent } from "./tool-types";

/**
 * Creates a tool instance from a tool definition
 */
export const createTool = <TState extends string, TContext = any>(
	definition: ToolDefinition<TState, TContext>,
): Tool<TState, TContext> => {
	const { id, name, icon, cursor, machine, context } = definition;

	// Start the state machine
	machine.start();

	return {
		id,
		name,
		icon,
		cursor,
		machine,
		context,

		handlePointerDown(point: Point, event: PointerEvent) {
			machine.send({ type: "POINTER_DOWN", point, event });
		},

		handlePointerMove(point: Point, event: PointerEvent) {
			machine.send({ type: "POINTER_MOVE", point, event });
		},

		handlePointerUp(point: Point, event: PointerEvent) {
			machine.send({ type: "POINTER_UP", point, event });
		},

		handleKeyDown(event: KeyboardEvent) {
			machine.send({ type: "KEY_DOWN", key: event.key, event });
		},

		handleKeyUp(event: KeyboardEvent) {
			machine.send({ type: "KEY_UP", key: event.key, event });
		},

		activate() {
			machine.send({ type: "ACTIVATE" });
		},

		deactivate() {
			machine.send({ type: "DEACTIVATE" });
		},

		getState() {
			return machine.state;
		},

		isActive() {
			return machine.state !== "idle";
		},
	};
};
