import { Canvas } from "@usketch/canvas-core";
import { DebugPanelVanilla } from "@usketch/ui-components";
import "./style.css";

// Initialize the whiteboard
const canvasElement = document.getElementById("canvas");
if (!canvasElement) {
	throw new Error("Canvas element not found");
}

const whiteboard = new Canvas(canvasElement);

// Expose store and toolManager for E2E testing and debug panel
if (typeof window !== "undefined") {
	(window as any).store = whiteboard.getStore();
	(window as any).toolManager = whiteboard.getToolManager();
}

// Initialize debug panel in development
if (import.meta.env.DEV) {
	new DebugPanelVanilla();
}

// Setup toolbar
const selectButton = document.getElementById("select-tool");
const rectangleButton = document.getElementById("rectangle-tool");

if (selectButton && rectangleButton) {
	selectButton.addEventListener("click", () => {
		whiteboard.getToolManager().setActiveTool("select");
		selectButton.classList.add("active");
		rectangleButton.classList.remove("active");
	});

	rectangleButton.addEventListener("click", () => {
		whiteboard.getToolManager().setActiveTool("rectangle");
		rectangleButton.classList.add("active");
		selectButton.classList.remove("active");
	});
}

// Add some test shapes for demonstration
setTimeout(() => {
	whiteboard.addTestShape();
}, 100);

// Add another test shape
setTimeout(async () => {
	const testShape2 = {
		id: `test-ellipse-${Date.now()}`,
		type: "ellipse" as const,
		x: 350,
		y: 200,
		width: 150,
		height: 100,
		rotation: 0,
		opacity: 1,
		strokeColor: "#d63384",
		fillColor: "#ffe0e6",
		strokeWidth: 3,
	};

	// Access the store directly
	const { whiteboardStore } = await import("@usketch/store");
	whiteboardStore.getState().addShape(testShape2);
}, 200);

console.log("DOM Whiteboard initialized");
