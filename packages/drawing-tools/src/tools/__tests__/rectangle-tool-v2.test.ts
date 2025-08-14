import { whiteboardStore } from "@usketch/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRectangleTool } from "../rectangle-tool-v2";

// Mock whiteboardStore
vi.mock("@usketch/store", () => {
	const mockStore = {
		shapes: {},
		addShape: vi.fn(),
		updateShape: vi.fn(),
		removeShape: vi.fn(),
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

describe("Rectangle Tool V2", () => {
	let tool: ReturnType<typeof createRectangleTool>;
	let mockStore: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCanvas.style.cursor = "";
		tool = createRectangleTool();
		mockStore = whiteboardStore.getState();
	});

	it("should create a rectangle tool with correct properties", () => {
		expect(tool.id).toBe("rectangle");
		expect(tool.name).toBe("Rectangle");
		expect(tool.icon).toBe("□");
		expect(tool.cursor).toBe("crosshair");
	});

	it("should transition through states correctly", () => {
		expect(tool.getState()).toBe("idle");

		tool.activate();
		expect(tool.getState()).toBe("active");

		tool.handlePointerDown({ x: 100, y: 100 }, new Event("pointerdown") as PointerEvent);
		expect(tool.getState()).toBe("drawing");

		tool.handlePointerUp({ x: 200, y: 200 }, new Event("pointerup") as PointerEvent);
		expect(tool.getState()).toBe("active");

		tool.deactivate();
		expect(tool.getState()).toBe("idle");
	});

	it("should create a shape on pointer down", () => {
		tool.activate();
		const point = { x: 100, y: 100 };

		tool.handlePointerDown(point, new Event("pointerdown") as PointerEvent);

		expect(mockStore.addShape).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "rectangle",
				x: 100,
				y: 100,
				width: 0,
				height: 0,
			}),
		);
	});

	it("should update shape dimensions on pointer move", () => {
		tool.activate();
		tool.handlePointerDown({ x: 100, y: 100 }, new Event("pointerdown") as PointerEvent);

		// Get the shape ID from the addShape call
		const shapeId = mockStore.addShape.mock.calls[0][0].id;

		tool.handlePointerMove({ x: 200, y: 150 }, new Event("pointermove") as PointerEvent);

		expect(mockStore.updateShape).toHaveBeenCalledWith(shapeId, {
			x: 100,
			y: 100,
			width: 100,
			height: 50,
		});
	});

	it("should handle drawing from bottom-right to top-left", () => {
		tool.activate();
		tool.handlePointerDown({ x: 200, y: 200 }, new Event("pointerdown") as PointerEvent);

		const shapeId = mockStore.addShape.mock.calls[0][0].id;

		tool.handlePointerMove({ x: 100, y: 100 }, new Event("pointermove") as PointerEvent);

		expect(mockStore.updateShape).toHaveBeenCalledWith(shapeId, {
			x: 100,
			y: 100,
			width: 100,
			height: 100,
		});
	});

	it("should remove small rectangles on pointer up", () => {
		tool.activate();
		tool.handlePointerDown({ x: 100, y: 100 }, new Event("pointerdown") as PointerEvent);

		const shapeId = mockStore.addShape.mock.calls[0][0].id;

		// Mock a small shape
		mockStore.shapes[shapeId] = { width: 3, height: 3 };

		tool.handlePointerUp({ x: 103, y: 103 }, new Event("pointerup") as PointerEvent);

		expect(mockStore.removeShape).toHaveBeenCalledWith(shapeId);
	});

	it("should cancel drawing on Escape key", () => {
		tool.activate();
		tool.handlePointerDown({ x: 100, y: 100 }, new Event("pointerdown") as PointerEvent);

		const shapeId = mockStore.addShape.mock.calls[0][0].id;

		const escapeEvent = new Event("keydown") as KeyboardEvent;
		Object.defineProperty(escapeEvent, "key", { value: "Escape" });

		tool.handleKeyDown(escapeEvent);

		expect(mockStore.removeShape).toHaveBeenCalledWith(shapeId);
		expect(tool.getState()).toBe("active");
	});

	it("should set appropriate cursor styles", () => {
		tool.activate();
		expect(mockCanvas.style.cursor).toBe("crosshair");

		tool.deactivate();
		expect(mockCanvas.style.cursor).toBe("default");
	});
});
