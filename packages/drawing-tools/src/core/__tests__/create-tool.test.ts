import { describe, expect, it, vi } from "vitest";
import { createTool } from "../create-tool";
import { createMachine } from "../state-machine";
import type { ToolEvent, ToolState } from "../tool-types";

// Mock DOM events for Node environment
global.PointerEvent = class PointerEvent extends Event {
	constructor(type: string, init?: any) {
		super(type, init);
	}
} as any;

global.KeyboardEvent = class KeyboardEvent extends Event {
	key: string;
	constructor(type: string, init?: any) {
		super(type, init);
		this.key = init?.key || "";
	}
} as any;

describe("createTool", () => {
	const mockMachine = () =>
		createMachine<ToolState, ToolEvent>({
			id: "test-tool",
			initial: "idle",
			states: {
				idle: {
					on: {
						ACTIVATE: "active",
						POINTER_DOWN: "drawing",
					},
				},
				active: {
					on: {
						DEACTIVATE: "idle",
						POINTER_DOWN: "drawing",
					},
				},
				drawing: {
					on: {
						POINTER_UP: "active",
						CANCEL: "active",
					},
				},
				dragging: {},
				editing: {},
				preview: {},
				completed: {},
				cancelled: {},
			},
		});

	it("should create a tool with all required methods", () => {
		const machine = mockMachine();
		const tool = createTool({
			id: "test",
			name: "Test Tool",
			icon: "🔧",
			cursor: "crosshair",
			machine,
		});

		expect(tool.id).toBe("test");
		expect(tool.name).toBe("Test Tool");
		expect(tool.icon).toBe("🔧");
		expect(tool.cursor).toBe("crosshair");
		expect(tool.handlePointerDown).toBeDefined();
		expect(tool.handlePointerMove).toBeDefined();
		expect(tool.handlePointerUp).toBeDefined();
		expect(tool.handleKeyDown).toBeDefined();
		expect(tool.handleKeyUp).toBeDefined();
		expect(tool.activate).toBeDefined();
		expect(tool.deactivate).toBeDefined();
		expect(tool.getState).toBeDefined();
		expect(tool.isActive).toBeDefined();
	});

	it("should start the state machine on creation", () => {
		const machine = mockMachine();
		const startSpy = vi.spyOn(machine, "start");

		createTool({
			id: "test",
			name: "Test Tool",
			machine,
		});

		expect(startSpy).toHaveBeenCalled();
	});

	it("should handle pointer events", () => {
		const machine = mockMachine();
		const sendSpy = vi.spyOn(machine, "send");

		const tool = createTool({
			id: "test",
			name: "Test Tool",
			machine,
		});

		const point = { x: 100, y: 200 };
		const event = new PointerEvent("pointerdown");

		tool.handlePointerDown(point, event);
		expect(sendSpy).toHaveBeenCalledWith({
			type: "POINTER_DOWN",
			point,
			event,
		});

		tool.handlePointerMove(point, event);
		expect(sendSpy).toHaveBeenCalledWith({
			type: "POINTER_MOVE",
			point,
			event,
		});

		tool.handlePointerUp(point, event);
		expect(sendSpy).toHaveBeenCalledWith({
			type: "POINTER_UP",
			point,
			event,
		});
	});

	it("should handle keyboard events", () => {
		const machine = mockMachine();
		const sendSpy = vi.spyOn(machine, "send");

		const tool = createTool({
			id: "test",
			name: "Test Tool",
			machine,
		});

		const keyDownEvent = new KeyboardEvent("keydown", { key: "Escape" });
		tool.handleKeyDown(keyDownEvent);
		expect(sendSpy).toHaveBeenCalledWith({
			type: "KEY_DOWN",
			key: "Escape",
			event: keyDownEvent,
		});

		const keyUpEvent = new KeyboardEvent("keyup", { key: "Shift" });
		tool.handleKeyUp(keyUpEvent);
		expect(sendSpy).toHaveBeenCalledWith({
			type: "KEY_UP",
			key: "Shift",
			event: keyUpEvent,
		});
	});

	it("should handle activation and deactivation", () => {
		const machine = mockMachine();
		const sendSpy = vi.spyOn(machine, "send");

		const tool = createTool({
			id: "test",
			name: "Test Tool",
			machine,
		});

		tool.activate();
		expect(sendSpy).toHaveBeenCalledWith({ type: "ACTIVATE" });

		tool.deactivate();
		expect(sendSpy).toHaveBeenCalledWith({ type: "DEACTIVATE" });
	});

	it("should provide state information", () => {
		const machine = mockMachine();
		const tool = createTool({
			id: "test",
			name: "Test Tool",
			machine,
		});

		expect(tool.getState()).toBe("idle");
		expect(tool.isActive()).toBe(false);

		tool.activate();
		expect(tool.getState()).toBe("active");
		expect(tool.isActive()).toBe(true);
	});

	it("should include context if provided", () => {
		const machine = mockMachine();
		const context = { someData: "test" };

		const tool = createTool({
			id: "test",
			name: "Test Tool",
			machine,
			context,
		});

		expect(tool.context).toEqual(context);
	});
});
