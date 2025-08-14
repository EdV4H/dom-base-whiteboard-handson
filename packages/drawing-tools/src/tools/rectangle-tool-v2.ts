import type { Point, RectangleShape } from "@usketch/shared-types";
import { whiteboardStore } from "@usketch/store";
import { createMachine, createTool, getRectBounds, setCursor, type ToolEvent } from "../core";

// Rectangle tool specific states
type RectangleState = "idle" | "active" | "drawing";

// Rectangle tool context
interface RectangleContext {
	startPoint: Point | null;
	currentShapeId: string | null;
}

// Create the state machine for rectangle tool
const createRectangleMachine = (context: RectangleContext) => {
	return createMachine<RectangleState, ToolEvent>({
		id: "rectangle",
		initial: "idle",
		states: {
			idle: {
				entry: () => setCursor("default"),
				on: {
					ACTIVATE: "active",
				},
			},
			active: {
				entry: () => setCursor("crosshair"),
				exit: () => {
					// Clean up on exit
					context.startPoint = null;
					context.currentShapeId = null;
				},
				on: {
					DEACTIVATE: "idle",
					POINTER_DOWN: {
						target: "drawing",
						action: (event) => {
							const { point } = event;
							context.startPoint = point;
							context.currentShapeId = `rect-${Date.now()}`;

							// Create initial rectangle
							const newShape: RectangleShape = {
								id: context.currentShapeId,
								type: "rectangle",
								x: point.x,
								y: point.y,
								width: 0,
								height: 0,
								rotation: 0,
								opacity: 1,
								strokeColor: "#333333",
								fillColor: "#ffffff",
								strokeWidth: 2,
							};

							whiteboardStore.getState().addShape(newShape);
						},
					},
				},
			},
			drawing: {
				on: {
					POINTER_MOVE: {
						target: "drawing",
						action: (event) => {
							if (!context.startPoint || !context.currentShapeId) return;

							const { point } = event;
							const bounds = getRectBounds(context.startPoint, point);
							whiteboardStore.getState().updateShape(context.currentShapeId, bounds);
						},
					},
					POINTER_UP: {
						target: "active",
						action: () => {
							if (context.currentShapeId) {
								// Check if rectangle is too small
								const shape = whiteboardStore.getState().shapes[context.currentShapeId];
								if (shape && "width" in shape && shape.width < 5 && shape.height < 5) {
									whiteboardStore.getState().removeShape(context.currentShapeId);
								}
							}

							// Reset context
							context.startPoint = null;
							context.currentShapeId = null;
						},
					},
					KEY_DOWN: {
						target: "active",
						cond: (event) => event.key === "Escape",
						action: () => {
							// Cancel current drawing
							if (context.currentShapeId) {
								whiteboardStore.getState().removeShape(context.currentShapeId);
							}

							// Reset context
							context.startPoint = null;
							context.currentShapeId = null;
						},
					},
				},
			},
		},
	});
};

// Create the rectangle tool
export const createRectangleTool = () => {
	const context: RectangleContext = {
		startPoint: null,
		currentShapeId: null,
	};

	const machine = createRectangleMachine(context);

	return createTool({
		id: "rectangle",
		name: "Rectangle",
		icon: "□",
		cursor: "crosshair",
		machine,
		context,
	});
};
