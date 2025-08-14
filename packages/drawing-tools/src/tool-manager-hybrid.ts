import type { Point } from "@usketch/shared-types";
import { whiteboardStore } from "@usketch/store";
import type { Tool } from "./tool";
import { ToolAdapter } from "./tool-adapter";
import { createRectangleTool } from "./tools/rectangle-tool-v2";
import { createSelectTool } from "./tools/select-tool-v2";

/**
 * Hybrid ToolManager that uses new functional tools via adapters
 * This provides a migration path from class-based to functional tools
 */
export class ToolManagerHybrid {
	private tools: Map<string, Tool> = new Map();
	private currentTool: Tool | null = null;

	constructor() {
		// Register new functional tools via adapters
		this.registerTool(new ToolAdapter(createSelectTool()));
		this.registerTool(new ToolAdapter(createRectangleTool()));

		// Set select tool as default
		this.setActiveTool("select");
	}

	registerTool(tool: Tool): void {
		this.tools.set(tool.id, tool);
	}

	setActiveTool(toolId: string, updateStore = true): void {
		const tool = this.tools.get(toolId);
		if (!tool) {
			console.warn(`Tool with id "${toolId}" not found`);
			return;
		}

		// Deactivate current tool
		if (this.currentTool) {
			this.currentTool.deactivate();
		}

		// Activate new tool
		this.currentTool = tool;
		this.currentTool.activate();

		// Update store only if requested (to avoid circular updates)
		if (updateStore) {
			whiteboardStore.setState({ currentTool: toolId });
		}
	}

	getCurrentTool(): Tool | null {
		return this.currentTool;
	}

	getActiveTool(): string {
		return this.currentTool?.id || "";
	}

	getTools(): Tool[] {
		return Array.from(this.tools.values());
	}

	// Event delegation methods
	handlePointerDown(event: PointerEvent, worldPos: Point): void {
		if (this.currentTool) {
			this.currentTool.onPointerDown(event, worldPos);
		}
	}

	handlePointerMove(event: PointerEvent, worldPos: Point): void {
		if (this.currentTool) {
			this.currentTool.onPointerMove(event, worldPos);
		}
	}

	handlePointerUp(event: PointerEvent, worldPos: Point): void {
		if (this.currentTool) {
			this.currentTool.onPointerUp(event, worldPos);
		}
	}

	handleKeyDown(event: KeyboardEvent): void {
		if (this.currentTool?.onKeyDown) {
			this.currentTool.onKeyDown(event);
		}
	}

	handleKeyUp(event: KeyboardEvent): void {
		if (this.currentTool?.onKeyUp) {
			this.currentTool.onKeyUp(event);
		}
	}
}
