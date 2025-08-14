import type { Point } from "@usketch/shared-types";
import type { StateMachine } from "./state-machine";

/**
 * Tool state types
 */
export type ToolState =
	| "idle"
	| "active"
	| "drawing"
	| "dragging"
	| "editing"
	| "preview"
	| "completed"
	| "cancelled";

/**
 * Tool event types
 */
export type ToolEvent =
	| { type: "ACTIVATE" }
	| { type: "DEACTIVATE" }
	| { type: "POINTER_DOWN"; point: Point; event: PointerEvent }
	| { type: "POINTER_MOVE"; point: Point; event: PointerEvent }
	| { type: "POINTER_UP"; point: Point; event: PointerEvent }
	| { type: "KEY_DOWN"; key: string; event: KeyboardEvent }
	| { type: "KEY_UP"; key: string; event: KeyboardEvent }
	| { type: "COMPLETE" }
	| { type: "CANCEL" };

/**
 * Tool context type
 */
export interface ToolContext<T = any> {
	data: T;
}

/**
 * Tool definition
 */
export interface ToolDefinition<TState extends string = ToolState, TContext = any> {
	id: string;
	name: string;
	icon?: string;
	cursor?: string;
	machine: StateMachine<TState, ToolEvent>;
	context?: TContext;
}

/**
 * Tool instance with event handlers
 */
export interface Tool<TState extends string = ToolState, TContext = any>
	extends ToolDefinition<TState, TContext> {
	handlePointerDown: (point: Point, event: PointerEvent) => void;
	handlePointerMove: (point: Point, event: PointerEvent) => void;
	handlePointerUp: (point: Point, event: PointerEvent) => void;
	handleKeyDown: (event: KeyboardEvent) => void;
	handleKeyUp: (event: KeyboardEvent) => void;
	activate: () => void;
	deactivate: () => void;
	getState: () => TState;
	isActive: () => boolean;
}

/**
 * Tool creator function type
 */
export type ToolCreator<TState extends string = ToolState, TContext = any> = (
	definition: ToolDefinition<TState, TContext>,
) => Tool<TState, TContext>;
