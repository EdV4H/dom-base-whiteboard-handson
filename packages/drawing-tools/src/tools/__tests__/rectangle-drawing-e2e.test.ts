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
		}),
		updateShape: vi.fn((id, updates) => {
			if (shapes[id]) {
				Object.assign(shapes[id], updates);
			}
		}),
		removeShape: vi.fn((id) => {
			delete shapes[id];
		}),
		clearShapes: vi.fn(() => {
			Object.keys(shapes).forEach((key) => delete shapes[key]);
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

describe("Rectangle Tool Drawing E2E", () => {
	let tool: ReturnType<typeof createRectangleTool>;
	let mockStore: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCanvas.style.cursor = "";
		tool = createRectangleTool();
		mockStore = whiteboardStore.getState();
		mockStore.clearShapes();
	});

	it("should create rectangles of different sizes", () => {
		tool.activate();

		// First rectangle: 100x100
		tool.handlePointerDown({ x: 50, y: 50 }, new PointerEvent("pointerdown"));
		expect(mockStore.addShape).toHaveBeenCalledTimes(1);

		const firstShapeId = Object.keys(mockStore.shapes)[0];
		expect(mockStore.shapes[firstShapeId]).toMatchObject({
			type: "rectangle",
			x: 50,
			y: 50,
			width: 0,
			height: 0,
		});

		// Drag to create size
		tool.handlePointerMove({ x: 150, y: 150 }, new PointerEvent("pointermove"));
		expect(mockStore.updateShape).toHaveBeenCalledWith(firstShapeId, {
			x: 50,
			y: 50,
			width: 100,
			height: 100,
		});

		// Verify the shape was updated
		expect(mockStore.shapes[firstShapeId]).toMatchObject({
			x: 50,
			y: 50,
			width: 100,
			height: 100,
		});

		// Release to complete
		tool.handlePointerUp({ x: 150, y: 150 }, new PointerEvent("pointerup"));

		// Second rectangle: 200x50
		tool.handlePointerDown({ x: 200, y: 200 }, new PointerEvent("pointerdown"));
		expect(mockStore.addShape).toHaveBeenCalledTimes(2);

		const secondShapeId = Object.keys(mockStore.shapes)[1];
		tool.handlePointerMove({ x: 400, y: 250 }, new PointerEvent("pointermove"));
		expect(mockStore.updateShape).toHaveBeenCalledWith(secondShapeId, {
			x: 200,
			y: 200,
			width: 200,
			height: 50,
		});

		tool.handlePointerUp({ x: 400, y: 250 }, new PointerEvent("pointerup"));

		// Verify both rectangles exist with correct sizes
		expect(Object.keys(mockStore.shapes).length).toBe(2);
		expect(mockStore.shapes[firstShapeId]).toMatchObject({
			width: 100,
			height: 100,
		});
		expect(mockStore.shapes[secondShapeId]).toMatchObject({
			width: 200,
			height: 50,
		});
	});

	it("should handle drag from bottom-right to top-left", () => {
		tool.activate();

		tool.handlePointerDown({ x: 300, y: 300 }, new PointerEvent("pointerdown"));
		const shapeId = Object.keys(mockStore.shapes)[0];

		// Drag to top-left
		tool.handlePointerMove({ x: 100, y: 100 }, new PointerEvent("pointermove"));

		expect(mockStore.updateShape).toHaveBeenCalledWith(shapeId, {
			x: 100,
			y: 100,
			width: 200,
			height: 200,
		});

		tool.handlePointerUp({ x: 100, y: 100 }, new PointerEvent("pointerup"));

		expect(mockStore.shapes[shapeId]).toMatchObject({
			x: 100,
			y: 100,
			width: 200,
			height: 200,
		});
	});

	it("should update size continuously during drag", () => {
		tool.activate();

		tool.handlePointerDown({ x: 0, y: 0 }, new PointerEvent("pointerdown"));
		const shapeId = Object.keys(mockStore.shapes)[0];

		// Multiple drag movements
		const movements = [
			{ x: 50, y: 50 },
			{ x: 100, y: 75 },
			{ x: 150, y: 100 },
			{ x: 200, y: 150 },
		];

		movements.forEach((pos, index) => {
			tool.handlePointerMove(pos, new PointerEvent("pointermove"));
			expect(mockStore.updateShape).toHaveBeenNthCalledWith(index + 1, shapeId, {
				x: 0,
				y: 0,
				width: pos.x,
				height: pos.y,
			});
		});

		tool.handlePointerUp({ x: 200, y: 150 }, new PointerEvent("pointerup"));

		// Final size should match last movement
		expect(mockStore.shapes[shapeId]).toMatchObject({
			width: 200,
			height: 150,
		});
	});

	it("should remove very small rectangles", () => {
		tool.activate();

		// Create a very small rectangle (less than 5x5)
		tool.handlePointerDown({ x: 100, y: 100 }, new PointerEvent("pointerdown"));
		const shapeId = Object.keys(mockStore.shapes)[0];

		tool.handlePointerMove({ x: 102, y: 102 }, new PointerEvent("pointermove"));
		tool.handlePointerUp({ x: 102, y: 102 }, new PointerEvent("pointerup"));

		// Should be removed because it's too small
		expect(mockStore.removeShape).toHaveBeenCalledWith(shapeId);
		expect(Object.keys(mockStore.shapes).length).toBe(0);
	});
});
