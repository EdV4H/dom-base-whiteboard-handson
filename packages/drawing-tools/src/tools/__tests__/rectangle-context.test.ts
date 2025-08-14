import { whiteboardStore } from "@usketch/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRectangleTool } from "../rectangle-tool-v2";

// Mock whiteboardStore
const shapes: Record<string, any> = {};
const mockStore = {
	shapes,
	addShape: vi.fn((shape) => {
		shapes[shape.id] = shape;
	}),
	updateShape: vi.fn((id, updates) => {
		if (shapes[id]) {
			Object.assign(shapes[id], updates);
		}
	}),
	removeShape: vi.fn((id) => {
		delete shapes[id];
	}),
};

vi.mock("@usketch/store", () => {
	return {
		whiteboardStore: {
			getState: vi.fn(() => mockStore),
		},
	};
});

// Mock DOM globals
const mockCanvas = { style: { cursor: "" } };
global.document = {
	querySelector: vi.fn(() => mockCanvas),
} as any;

global.PointerEvent = class PointerEvent extends Event {
	constructor(type: string, init?: any) {
		super(type, init);
		Object.assign(this, init);
	}
} as any;

describe("Rectangle Tool Context Test", () => {
	let mockStore: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockStore = whiteboardStore.getState();
	});

	it("should maintain context between POINTER_DOWN and POINTER_MOVE", () => {
		const tool = createRectangleTool();

		// Access the machine's context through closure
		const contextBefore = JSON.stringify((tool as any).context);
		console.log("Context before activation:", contextBefore);

		// Add a marker to the context to track it
		(tool as any).context.marker = "TOOL_CONTEXT";
		console.log("Added marker to tool.context");

		tool.activate();

		// Trigger POINTER_DOWN
		tool.handlePointerDown({ x: 100, y: 100 }, new PointerEvent("pointerdown"));

		const contextAfterDown = JSON.stringify((tool as any).context);
		console.log("Context after POINTER_DOWN:", contextAfterDown);

		const machineContext = (tool as any).getMachineContext();
		console.log("Machine context after POINTER_DOWN:", machineContext);

		// The context should have been updated
		expect((tool as any).context.startPoint).toEqual({ x: 100, y: 100 });
		expect((tool as any).context.currentShapeId).toMatch(/^rect-/);

		// Trigger POINTER_MOVE
		tool.handlePointerMove({ x: 200, y: 200 }, new PointerEvent("pointermove"));

		const contextAfterMove = JSON.stringify((tool as any).context);
		console.log("Context after POINTER_MOVE:", contextAfterMove);

		// Context should still be the same
		expect((tool as any).context.startPoint).toEqual({ x: 100, y: 100 });

		// updateShape should have been called
		expect(mockStore.updateShape).toHaveBeenCalledWith((tool as any).context.currentShapeId, {
			x: 100,
			y: 100,
			width: 100,
			height: 100,
		});
	});
});
