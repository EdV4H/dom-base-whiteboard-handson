import { whiteboardStore } from "@usketch/store";

interface DebugInfo {
	currentTool: string;
	toolState?: string;
	shapeCount: number;
	selectedShapes: number;
	canvasSize: { width: number; height: number };
	mousePosition: { x: number; y: number };
}

export class DebugPanelVanilla {
	private container: HTMLDivElement;
	private debugInfo: DebugInfo = {
		currentTool: "",
		shapeCount: 0,
		selectedShapes: 0,
		canvasSize: { width: 0, height: 0 },
		mousePosition: { x: 0, y: 0 },
	};
	private isMinimized = false;
	private unsubscribe?: () => void;
	private updateInterval?: number;

	constructor() {
		this.container = this.createContainer();
		this.setupEventListeners();
		this.startUpdates();
	}

	private createContainer(): HTMLDivElement {
		const container = document.createElement("div");
		container.id = "debug-panel";
		container.style.cssText = `
			position: fixed;
			top: 10px;
			right: 10px;
			background-color: rgba(0, 0, 0, 0.85);
			color: white;
			padding: 15px;
			border-radius: 8px;
			font-size: 12px;
			font-family: monospace;
			min-width: 200px;
			z-index: 10000;
			box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
		`;

		container.innerHTML = this.getContent();
		document.body.appendChild(container);
		return container;
	}

	private getContent(): string {
		if (this.isMinimized) {
			return `<div style="cursor: pointer;">🐛 Debug</div>`;
		}

		return `
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 8px;">
				<h3 style="margin: 0; font-size: 14px;">🐛 Debug Panel</h3>
				<button id="minimize-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; padding: 0; width: 20px; height: 20px;">−</button>
			</div>
			<div style="display: flex; flex-direction: column; gap: 6px;">
				<div>
					<strong>Tool:</strong> 
					<span style="color: #4ade80;">${this.debugInfo.currentTool || "none"}</span>
					${this.debugInfo.toolState ? `<span style="color: #fbbf24; margin-left: 8px;">[${this.debugInfo.toolState}]</span>` : ""}
				</div>
				<div>
					<strong>Shapes:</strong> 
					<span style="color: #60a5fa;">${this.debugInfo.shapeCount}</span>
					${this.debugInfo.selectedShapes > 0 ? `<span style="color: #f472b6; margin-left: 8px;">(${this.debugInfo.selectedShapes} selected)</span>` : ""}
				</div>
				<div>
					<strong>Canvas:</strong> 
					<span style="color: #a78bfa;">${this.debugInfo.canvasSize.width} × ${this.debugInfo.canvasSize.height}</span>
				</div>
				<div>
					<strong>Mouse:</strong> 
					<span style="color: #fde047;">(${this.debugInfo.mousePosition.x}, ${this.debugInfo.mousePosition.y})</span>
				</div>
				<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.2); font-size: 10px; opacity: 0.7;">
					<div>Branch: feature/tool-system-extension</div>
					<div>Environment: development</div>
				</div>
			</div>
		`;
	}

	private setupEventListeners(): void {
		// Click handler for minimize/maximize
		this.container.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			if (this.isMinimized || target.id === "minimize-btn") {
				this.isMinimized = !this.isMinimized;
				this.update();
			}
		});

		// Subscribe to store updates
		this.unsubscribe = whiteboardStore.subscribe((state) => {
			const shapes = Object.values(state.shapes);
			const selectedCount = shapes.filter((shape: any) => shape.selected).length;

			this.debugInfo.currentTool = state.currentTool;
			this.debugInfo.shapeCount = shapes.length;
			this.debugInfo.selectedShapes = selectedCount;
			this.update();
		});

		// Get initial canvas size
		const canvas = document.querySelector("canvas");
		if (canvas) {
			this.debugInfo.canvasSize = { width: canvas.width, height: canvas.height };
		}

		// Track mouse position
		document.addEventListener("mousemove", (e) => {
			const canvas = document.querySelector("canvas");
			if (canvas) {
				const rect = canvas.getBoundingClientRect();
				this.debugInfo.mousePosition = {
					x: Math.round(e.clientX - rect.left),
					y: Math.round(e.clientY - rect.top),
				};
				this.update();
			}
		});
	}

	private startUpdates(): void {
		// Update tool state every 100ms
		this.updateInterval = window.setInterval(() => {
			const toolManager = (window as any).toolManager;
			if (toolManager?.currentTool?.getState) {
				const newState = toolManager.currentTool.getState();
				if (newState !== this.debugInfo.toolState) {
					this.debugInfo.toolState = newState;
					this.update();
				}
			}
		}, 100);
	}

	private update(): void {
		this.container.innerHTML = this.getContent();

		// Update styles for minimized state
		if (this.isMinimized) {
			this.container.style.padding = "5px 10px";
			this.container.style.minWidth = "auto";
		} else {
			this.container.style.padding = "15px";
			this.container.style.minWidth = "200px";
		}
	}

	public destroy(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
		}
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
		}
		this.container.remove();
	}
}

// Auto-initialize for vanilla JS
if (typeof window !== "undefined" && document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		// Auto-initialize in development builds
		new DebugPanelVanilla();
	});
} else if (typeof window !== "undefined") {
	// Auto-initialize if DOM is already loaded
	new DebugPanelVanilla();
}
