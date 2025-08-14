import type { Point } from "@usketch/shared-types";
import { whiteboardStore } from "@usketch/store";
import { createMachine, createTool, setCursor, type ToolEvent } from "../core";

// Select tool specific states
type SelectState = "idle" | "active" | "dragging";

// Select tool context
interface SelectContext {
	draggedShapeId: string | null;
	dragStart: Point | null;
	shapeStartPosition: Point | null;
}

// Create the state machine for select tool
const createSelectMachine = () => {
	const context: SelectContext = {
		draggedShapeId: null,
		dragStart: null,
		shapeStartPosition: null,
	};

	return createMachine<SelectState, ToolEvent>({
		id: "select",
		initial: "idle",
		states: {
			idle: {
				on: {
					ACTIVATE: "active",
				},
			},
			active: {
				entry: () => setCursor("default"),
				exit: () => {
					// Clean up on exit
					context.draggedShapeId = null;
					context.dragStart = null;
					context.shapeStartPosition = null;
				},
				on: {
					DEACTIVATE: "idle",
					POINTER_DOWN: {
						target: "active",
						action: (event) => {
							const { point, event: pointerEvent } = event;
							const store = whiteboardStore.getState();

							// Check if clicking on a shape
							const target = pointerEvent.target as HTMLElement;
							const shapeElement = target.closest('[data-shape="true"]') as HTMLElement;
							const shapeId = shapeElement?.dataset["shapeId"];

							if (shapeId) {
								// Handle shape selection
								if (!pointerEvent.shiftKey && !store.selectedShapeIds.has(shapeId)) {
									store.clearSelection();
								}

								// Select the shape if not already selected
								if (!store.selectedShapeIds.has(shapeId)) {
									store.selectShape(shapeId);
								}

								// Prepare for dragging
								const shape = store.shapes[shapeId];
								if (shape) {
									context.draggedShapeId = shapeId;
									context.dragStart = point;
									context.shapeStartPosition = { x: shape.x, y: shape.y };
								}
							} else {
								// Clicking on empty space - clear selection
								if (!pointerEvent.shiftKey) {
									store.clearSelection();
								}
							}
						},
					},
					POINTER_MOVE: {
						target: "dragging",
						cond: () => context.draggedShapeId !== null && context.dragStart !== null,
					},
				},
			},
			dragging: {
				entry: () => setCursor("grabbing"),
				exit: () => setCursor("default"),
				on: {
					POINTER_MOVE: {
						target: "dragging",
						action: (event) => {
							if (!context.draggedShapeId || !context.dragStart || !context.shapeStartPosition) {
								return;
							}

							const { point } = event;
							const deltaX = point.x - context.dragStart.x;
							const deltaY = point.y - context.dragStart.y;

							whiteboardStore.getState().updateShape(context.draggedShapeId, {
								x: context.shapeStartPosition.x + deltaX,
								y: context.shapeStartPosition.y + deltaY,
							});
						},
					},
					POINTER_UP: {
						target: "active",
						action: () => {
							// Reset drag context
							context.draggedShapeId = null;
							context.dragStart = null;
							context.shapeStartPosition = null;
						},
					},
				},
			},
		},
	});
};

// Create the select tool
export const createSelectTool = () => {
	const machine = createSelectMachine();

	return createTool({
		id: "select",
		name: "Select",
		icon: "↖",
		cursor: "default",
		machine,
	});
};
