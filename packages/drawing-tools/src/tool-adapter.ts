import type { Point } from "@usketch/shared-types";
import type { Tool as FunctionalTool } from "./core";
import type { Tool as LegacyTool } from "./tool";

/**
 * Adapter to make functional tools work with the legacy Tool interface
 */
export class ToolAdapter implements LegacyTool {
	private functionalTool: FunctionalTool<any, any>;

	constructor(functionalTool: FunctionalTool<any, any>) {
		this.functionalTool = functionalTool;
	}

	get id(): string {
		return this.functionalTool.id;
	}

	get name(): string {
		return this.functionalTool.name;
	}

	get icon(): string {
		return this.functionalTool.icon || "";
	}

	get cursor(): string {
		return this.functionalTool.cursor || "default";
	}

	activate(): void {
		this.functionalTool.activate();
	}

	deactivate(): void {
		this.functionalTool.deactivate();
	}

	onPointerDown(event: PointerEvent, worldPos: Point): void {
		this.functionalTool.handlePointerDown(worldPos, event);
	}

	onPointerMove(event: PointerEvent, worldPos: Point): void {
		this.functionalTool.handlePointerMove(worldPos, event);
	}

	onPointerUp(event: PointerEvent, worldPos: Point): void {
		this.functionalTool.handlePointerUp(worldPos, event);
	}

	onKeyDown?(event: KeyboardEvent): void {
		this.functionalTool.handleKeyDown(event);
	}

	onKeyUp?(event: KeyboardEvent): void {
		this.functionalTool.handleKeyUp(event);
	}

	isActive(): boolean {
		return this.functionalTool.isActive();
	}
}
