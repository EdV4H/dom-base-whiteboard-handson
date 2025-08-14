import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTool } from "../create-tool";
import { createMachine } from "../state-machine";
import { compose, getRectBounds, setCursor, withConstraints, withSnapping } from "../tool-helpers";
import type { ToolEvent, ToolState } from "../tool-types";

// Mock DOM events for Node environment
global.PointerEvent = class PointerEvent extends Event {
	constructor(type: string, init?: any) {
		super(type, init);
	}
} as any;

describe("Tool Helpers", () => {
	const createMockTool = () => {
		const machine = createMachine<ToolState, ToolEvent>({
			id: "mock",
			initial: "idle",
			states: {
				idle: {},
				active: {},
				drawing: {},
				dragging: {},
				editing: {},
				preview: {},
				completed: {},
				cancelled: {},
			},
		});

		return createTool({
			id: "mock",
			name: "Mock Tool",
			machine,
		});
	};

	describe("withSnapping", () => {
		it("should snap points to grid when enabled", () => {
			const tool = createMockTool();
			const handlePointerDownSpy = vi.spyOn(tool, "handlePointerDown");

			const snappedTool = withSnapping({ gridSize: 10, enabled: true })(tool);
			const event = new PointerEvent("pointerdown");

			snappedTool.handlePointerDown({ x: 23, y: 47 }, event);

			expect(handlePointerDownSpy).toHaveBeenCalledWith({ x: 20, y: 50 }, event);
		});

		it("should not snap when disabled", () => {
			const tool = createMockTool();
			const handlePointerDownSpy = vi.spyOn(tool, "handlePointerDown");

			const snappedTool = withSnapping({ gridSize: 10, enabled: false })(tool);
			const event = new PointerEvent("pointerdown");

			snappedTool.handlePointerDown({ x: 23, y: 47 }, event);

			expect(handlePointerDownSpy).toHaveBeenCalledWith({ x: 23, y: 47 }, event);
		});

		it("should snap all pointer events", () => {
			const tool = createMockTool();
			const snappedTool = withSnapping({ gridSize: 5, enabled: true })(tool);

			const handlePointerMoveSpy = vi.spyOn(tool, "handlePointerMove");
			const handlePointerUpSpy = vi.spyOn(tool, "handlePointerUp");

			const moveEvent = new PointerEvent("pointermove");
			const upEvent = new PointerEvent("pointerup");

			snappedTool.handlePointerMove({ x: 12, y: 18 }, moveEvent);
			snappedTool.handlePointerUp({ x: 33, y: 27 }, upEvent);

			expect(handlePointerMoveSpy).toHaveBeenCalledWith({ x: 10, y: 20 }, moveEvent);
			expect(handlePointerUpSpy).toHaveBeenCalledWith({ x: 35, y: 25 }, upEvent);
		});
	});

	describe("compose", () => {
		it("should compose multiple enhancers", () => {
			const tool = createMockTool();
			const handlePointerDownSpy = vi.spyOn(tool, "handlePointerDown");

			const enhancer1 = withSnapping({ gridSize: 10, enabled: true });
			const enhancer2 = withSnapping({ gridSize: 5, enabled: true });

			const composedTool = compose(enhancer1, enhancer2)(tool);
			const event = new PointerEvent("pointerdown");

			// Should apply enhancers from right to left
			// First snap to 5, then to 10
			composedTool.handlePointerDown({ x: 23, y: 47 }, event);

			// 23 -> 25 (grid 5) -> 30 (grid 10)
			// 47 -> 45 (grid 5) -> 50 (grid 10)
			expect(handlePointerDownSpy).toHaveBeenCalledWith({ x: 20, y: 50 }, event);
		});

		it("should work with single enhancer", () => {
			const tool = createMockTool();
			const handlePointerDownSpy = vi.spyOn(tool, "handlePointerDown");

			const composedTool = compose(withSnapping({ gridSize: 10, enabled: true }))(tool);

			const event = new PointerEvent("pointerdown");
			composedTool.handlePointerDown({ x: 14, y: 26 }, event);

			expect(handlePointerDownSpy).toHaveBeenCalledWith({ x: 10, y: 30 }, event);
		});
	});

	describe("setCursor", () => {
		let mockCanvas: HTMLElement;

		beforeEach(() => {
			// @vitest-environment jsdom
			mockCanvas = {
				style: { cursor: "" },
			} as HTMLElement;

			vi.spyOn(document, "querySelector").mockReturnValue(mockCanvas);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should set cursor style on canvas element", () => {
			setCursor("crosshair");
			expect(mockCanvas.style.cursor).toBe("crosshair");

			setCursor("pointer");
			expect(mockCanvas.style.cursor).toBe("pointer");
		});

		it("should handle missing canvas element gracefully", () => {
			vi.spyOn(document, "querySelector").mockReturnValue(null);

			// Should not throw
			expect(() => setCursor("crosshair")).not.toThrow();
		});
	});

	describe("getRectBounds", () => {
		it("should calculate bounds from top-left to bottom-right", () => {
			const bounds = getRectBounds({ x: 10, y: 20 }, { x: 50, y: 80 });

			expect(bounds).toEqual({
				x: 10,
				y: 20,
				width: 40,
				height: 60,
			});
		});

		it("should calculate bounds from bottom-right to top-left", () => {
			const bounds = getRectBounds({ x: 50, y: 80 }, { x: 10, y: 20 });

			expect(bounds).toEqual({
				x: 10,
				y: 20,
				width: 40,
				height: 60,
			});
		});

		it("should handle zero-size rectangles", () => {
			const bounds = getRectBounds({ x: 30, y: 40 }, { x: 30, y: 40 });

			expect(bounds).toEqual({
				x: 30,
				y: 40,
				width: 0,
				height: 0,
			});
		});

		it("should handle negative coordinates", () => {
			const bounds = getRectBounds({ x: -10, y: -20 }, { x: 10, y: 20 });

			expect(bounds).toEqual({
				x: -10,
				y: -20,
				width: 20,
				height: 40,
			});
		});
	});
});
