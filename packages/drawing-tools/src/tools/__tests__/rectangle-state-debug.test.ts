import { whiteboardStore } from "@usketch/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRectangleTool } from "../rectangle-tool-v2";

// Mock whiteboardStore
vi.mock("@usketch/store", () => {
	const shapes: Record<string, any> = {};
	const mockStore = {
		shapes,
		addShape: vi.fn((shape) => {
			shapes[shape.id] = shape;
			console.log("Added shape:", shape);
		}),
		updateShape: vi.fn((id, updates) => {
			console.log("Updating shape:", id, updates);
			if (shapes[id]) {
				Object.assign(shapes[id], updates);
			}
		}),
		removeShape: vi.fn((id) => {
			delete shapes[id];
		}),
	};

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

describe("Rectangle Tool State Debug", () => {
	let mockStore: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCanvas.style.cursor = "";
		mockStore = whiteboardStore.getState();

		// Clear any previous shapes
		Object.keys(mockStore.shapes).forEach((key) => delete mockStore.shapes[key]);
	});

	it("should debug state transitions", () => {
		const tool = createRectangleTool();
		console.log("Initial state:", tool.getState());
		console.log("Tool context:", (tool as any).context);
		expect(tool.getState()).toBe("idle");

		// Activate tool
		tool.activate();
		console.log("After activate:", tool.getState());
		expect(tool.getState()).toBe("active");

		// Start drawing
		const downEvent = new PointerEvent("pointerdown");
		tool.handlePointerDown({ x: 100, y: 100 }, downEvent);
		console.log("After pointer down:", tool.getState());
		console.log("Tool context after POINTER_DOWN:", (tool as any).context);
		expect(tool.getState()).toBe("drawing");

		// Check that shape was added
		expect(mockStore.addShape).toHaveBeenCalled();
		const shapeId = Object.keys(mockStore.shapes)[0];
		console.log("Created shape ID:", shapeId);

		// Move pointer
		const moveEvent = new PointerEvent("pointermove");
		console.log("Before pointer move, state:", tool.getState());
		console.log("Tool context before POINTER_MOVE:", (tool as any).context);
		tool.handlePointerMove({ x: 200, y: 200 }, moveEvent);
		console.log("After pointer move, state:", tool.getState());

		// Check if updateShape was called
		console.log("updateShape calls:", mockStore.updateShape.mock.calls);
		expect(mockStore.updateShape).toHaveBeenCalled();
	});

	it("should test state machine directly", () => {
		const tool = createRectangleTool();
		tool.activate();
		expect(tool.getState()).toBe("active");

		// Get the machine directly
		const machine = (tool as any).machine;
		console.log("Machine state before POINTER_DOWN:", machine.state);
		console.log("Tool context before POINTER_DOWN:", (tool as any).context);

		// Send POINTER_DOWN event directly
		machine.send({
			type: "POINTER_DOWN",
			point: { x: 50, y: 50 },
			event: new PointerEvent("pointerdown"),
		});
		console.log("Machine state after POINTER_DOWN:", machine.state);
		console.log("Tool context after POINTER_DOWN:", (tool as any).context);
		expect(machine.state).toBe("drawing");

		// Send POINTER_MOVE event directly
		machine.send({
			type: "POINTER_MOVE",
			point: { x: 150, y: 150 },
			event: new PointerEvent("pointermove"),
		});
		console.log("Tool context after POINTER_MOVE:", (tool as any).context);
		console.log("updateShape called:", mockStore.updateShape.mock.calls.length, "times");
	});
});
