import type { Point } from "@usketch/shared-types";
import { whiteboardStore } from "@usketch/store";
import type { Tool } from "./core";

/**
 * Functional tool manager
 */
export interface ToolManagerState {
	tools: Map<string, Tool>;
	activeToolId: string | null;
	activeTool: Tool | null;
}

export interface ToolManager {
	registerTool: (tool: Tool) => void;
	setActiveTool: (toolId: string) => void;
	getActiveTool: () => string | null;
	getTools: () => Tool[];
	handlePointerDown: (point: Point, event: PointerEvent) => void;
	handlePointerMove: (point: Point, event: PointerEvent) => void;
	handlePointerUp: (point: Point, event: PointerEvent) => void;
	handleKeyDown: (event: KeyboardEvent) => void;
	handleKeyUp: (event: KeyboardEvent) => void;
}

/**
 * Create a functional tool manager
 */
export const createToolManager = (): ToolManager => {
	const state: ToolManagerState = {
		tools: new Map(),
		activeToolId: null,
		activeTool: null,
	};

	const registerTool = (tool: Tool) => {
		state.tools.set(tool.id, tool);
	};

	const setActiveTool = (toolId: string) => {
		// Deactivate current tool
		if (state.activeTool) {
			state.activeTool.deactivate();
		}

		// Get new tool
		const tool = state.tools.get(toolId);
		if (!tool) {
			console.warn(`Tool with id "${toolId}" not found`);
			return;
		}

		// Activate new tool
		state.activeToolId = toolId;
		state.activeTool = tool;
		tool.activate();

		// Update store
		whiteboardStore.setState({ currentTool: toolId });
	};

	const getActiveTool = () => state.activeToolId;

	const getTools = () => Array.from(state.tools.values());

	const handlePointerDown = (point: Point, event: PointerEvent) => {
		if (state.activeTool) {
			state.activeTool.handlePointerDown(point, event);
		}
	};

	const handlePointerMove = (point: Point, event: PointerEvent) => {
		if (state.activeTool) {
			state.activeTool.handlePointerMove(point, event);
		}
	};

	const handlePointerUp = (point: Point, event: PointerEvent) => {
		if (state.activeTool) {
			state.activeTool.handlePointerUp(point, event);
		}
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (state.activeTool) {
			state.activeTool.handleKeyDown(event);
		}
	};

	const handleKeyUp = (event: KeyboardEvent) => {
		if (state.activeTool) {
			state.activeTool.handleKeyUp(event);
		}
	};

	return {
		registerTool,
		setActiveTool,
		getActiveTool,
		getTools,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
		handleKeyDown,
		handleKeyUp,
	};
};
