import type { Point } from "@usketch/shared-types";
import type { Tool, ToolDefinition } from "./tool-types";

/**
 * Higher-order function to add snapping functionality to a tool
 */
export interface SnapConfig {
	gridSize: number;
	enabled: boolean;
}

export const withSnapping =
	<TState extends string, TContext>(config: SnapConfig) =>
	(tool: Tool<TState, TContext>): Tool<TState, TContext> => {
		if (!config.enabled) return tool;

		const snapPoint = (point: Point): Point => ({
			x: Math.round(point.x / config.gridSize) * config.gridSize,
			y: Math.round(point.y / config.gridSize) * config.gridSize,
		});

		return {
			...tool,
			handlePointerDown(point: Point, event: PointerEvent) {
				tool.handlePointerDown(snapPoint(point), event);
			},
			handlePointerMove(point: Point, event: PointerEvent) {
				tool.handlePointerMove(snapPoint(point), event);
			},
			handlePointerUp(point: Point, event: PointerEvent) {
				tool.handlePointerUp(snapPoint(point), event);
			},
		};
	};

/**
 * Higher-order function to add aspect ratio constraints
 */
export interface ConstraintConfig {
	aspectRatio?: number;
	shiftKey?: boolean;
}

export const withConstraints =
	<TState extends string, TContext>(config: ConstraintConfig) =>
	(tool: Tool<TState, TContext>): Tool<TState, TContext> => {
		return {
			...tool,
			handlePointerMove(point: Point, event: PointerEvent) {
				let constrainedPoint = point;

				if (config.shiftKey && event.shiftKey && config.aspectRatio) {
					// Apply aspect ratio constraint when shift is held
					// This is simplified - actual implementation would need start point
					constrainedPoint = point;
				}

				tool.handlePointerMove(constrainedPoint, event);
			},
		};
	};

/**
 * Compose multiple tool enhancers
 */
export const compose =
	<TState extends string, TContext>(
		...enhancers: Array<(tool: Tool<TState, TContext>) => Tool<TState, TContext>>
	) =>
	(tool: Tool<TState, TContext>): Tool<TState, TContext> =>
		enhancers.reduceRight((acc, enhancer) => enhancer(acc), tool);

/**
 * Helper to set cursor style
 */
export const setCursor = (cursor: string) => {
	const canvas = document.querySelector(".whiteboard-canvas") as HTMLElement;
	if (canvas) {
		canvas.style.cursor = cursor;
	}
};

/**
 * Helper to calculate rectangle bounds from two points
 */
export const getRectBounds = (start: Point, end: Point) => {
	const x = Math.min(start.x, end.x);
	const y = Math.min(start.y, end.y);
	const width = Math.abs(end.x - start.x);
	const height = Math.abs(end.y - start.y);

	return { x, y, width, height };
};
