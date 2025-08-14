import { whiteboardStore } from "@usketch/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSelectTool } from "../select-tool-v2";

// Mock whiteboardStore
vi.mock("@usketch/store", () => {
	const mockStore = {
		shapes: {
			"shape-1": { id: "shape-1", x: 100, y: 100 },
			"shape-2": { id: "shape-2", x: 200, y: 200 },
		},
		selectedShapeIds: new Set(),
		clearSelection: vi.fn(),
		selectShape: vi.fn(),
		updateShape: vi.fn(),
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

describe("Select Tool V2", () => {
	let tool: ReturnType<typeof createSelectTool>;
	let mockStore: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCanvas.style.cursor = "";
		tool = createSelectTool();
		mockStore = whiteboardStore.getState();
	});

	it("should create a select tool with correct properties", () => {
		expect(tool.id).toBe("select");
		expect(tool.name).toBe("Select");
		expect(tool.icon).toBe("↖");
		expect(tool.cursor).toBe("default");
	});

	it("should transition through states correctly", () => {
		expect(tool.getState()).toBe("idle");

		tool.activate();
		expect(tool.getState()).toBe("active");

		tool.deactivate();
		expect(tool.getState()).toBe("idle");
	});

	it("should select a shape on click", () => {
		tool.activate();

		const mockElement = {
			closest: vi.fn(() => ({ dataset: { shapeId: "shape-1" } })),
		};
		const event = {
			target: mockElement,
			shiftKey: false,
		} as any;

		tool.handlePointerDown({ x: 100, y: 100 }, event);

		expect(mockStore.clearSelection).toHaveBeenCalled();
		expect(mockStore.selectShape).toHaveBeenCalledWith("shape-1");
	});

	it("should add to selection with shift key", () => {
		tool.activate();

		// Set up existing selection
		mockStore.selectedShapeIds.add("shape-1");

		const mockElement = {
			closest: vi.fn(() => ({ dataset: { shapeId: "shape-2" } })),
		};
		const event = {
			target: mockElement,
			shiftKey: true,
		} as any;

		tool.handlePointerDown({ x: 200, y: 200 }, event);

		expect(mockStore.clearSelection).not.toHaveBeenCalled();
		expect(mockStore.selectShape).toHaveBeenCalledWith("shape-2");
	});

	it("should clear selection when clicking empty space", () => {
		tool.activate();

		const mockElement = {
			closest: vi.fn(() => null),
		};
		const event = {
			target: mockElement,
			shiftKey: false,
		} as any;

		tool.handlePointerDown({ x: 50, y: 50 }, event);

		expect(mockStore.clearSelection).toHaveBeenCalled();
	});

	it("should drag selected shape", () => {
		tool.activate();

		// Select a shape
		const mockElement = {
			closest: vi.fn(() => ({ dataset: { shapeId: "shape-1" } })),
		};
		const downEvent = {
			target: mockElement,
			shiftKey: false,
		} as any;

		tool.handlePointerDown({ x: 100, y: 100 }, downEvent);

		// Start dragging
		tool.handlePointerMove({ x: 110, y: 110 }, new Event("pointermove") as PointerEvent);
		expect(tool.getState()).toBe("dragging");

		// Continue dragging
		tool.handlePointerMove({ x: 150, y: 150 }, new Event("pointermove") as PointerEvent);

		expect(mockStore.updateShape).toHaveBeenCalledWith("shape-1", {
			x: 150, // 100 + (150 - 100)
			y: 150, // 100 + (150 - 100)
		});

		// End dragging
		tool.handlePointerUp({ x: 150, y: 150 }, new Event("pointerup") as PointerEvent);
		expect(tool.getState()).toBe("active");
	});

	it("should set appropriate cursor styles", () => {
		tool.activate();
		expect(mockCanvas.style.cursor).toBe("default");

		// Start dragging
		const mockElement = {
			closest: vi.fn(() => ({ dataset: { shapeId: "shape-1" } })),
		};
		const event = {
			target: mockElement,
			shiftKey: false,
		} as any;

		tool.handlePointerDown({ x: 100, y: 100 }, event);
		tool.handlePointerMove({ x: 110, y: 110 }, new Event("pointermove") as PointerEvent);

		expect(mockCanvas.style.cursor).toBe("grabbing");

		tool.handlePointerUp({ x: 110, y: 110 }, new Event("pointerup") as PointerEvent);
		expect(mockCanvas.style.cursor).toBe("default");
	});

	it("should not drag when no shape is selected", () => {
		tool.activate();

		const mockElement = {
			closest: vi.fn(() => null),
		};
		const event = {
			target: mockElement,
			shiftKey: false,
		} as any;

		tool.handlePointerDown({ x: 50, y: 50 }, event);
		tool.handlePointerMove({ x: 100, y: 100 }, new Event("pointermove") as PointerEvent);

		expect(tool.getState()).toBe("active"); // Should not transition to dragging
		expect(mockStore.updateShape).not.toHaveBeenCalled();
	});
});
