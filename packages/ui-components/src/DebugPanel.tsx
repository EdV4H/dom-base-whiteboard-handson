import { whiteboardStore } from "@usketch/store";
import type { FC } from "react";
import React, { useEffect, useState } from "react";

interface DebugInfo {
	currentTool: string;
	toolState?: string;
	shapeCount: number;
	selectedShapes: number;
	canvasSize: { width: number; height: number };
	mousePosition: { x: number; y: number };
}

export const DebugPanel: FC = () => {
	const [debugInfo, setDebugInfo] = useState<DebugInfo>({
		currentTool: "",
		shapeCount: 0,
		selectedShapes: 0,
		canvasSize: { width: 0, height: 0 },
		mousePosition: { x: 0, y: 0 },
	});

	const [isMinimized, setIsMinimized] = useState(false);

	useEffect(() => {
		// Subscribe to store updates
		const unsubscribe = whiteboardStore.subscribe((state) => {
			const shapes = Object.values(state.shapes);
			const selectedCount = shapes.filter((shape: any) => shape.selected).length;

			setDebugInfo((prev) => ({
				...prev,
				currentTool: state.currentTool,
				shapeCount: shapes.length,
				selectedShapes: selectedCount,
			}));
		});

		// Get initial canvas size
		const canvas = document.querySelector("canvas");
		if (canvas) {
			setDebugInfo((prev) => ({
				...prev,
				canvasSize: { width: canvas.width, height: canvas.height },
			}));
		}

		// Track mouse position
		const handleMouseMove = (e: MouseEvent) => {
			const canvas = document.querySelector("canvas");
			if (canvas) {
				const rect = canvas.getBoundingClientRect();
				setDebugInfo((prev) => ({
					...prev,
					mousePosition: {
						x: Math.round(e.clientX - rect.left),
						y: Math.round(e.clientY - rect.top),
					},
				}));
			}
		};

		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			unsubscribe();
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	// Get tool state from the tool manager (if available)
	useEffect(() => {
		const updateToolState = () => {
			const toolManager = (window as any).toolManager;
			if (toolManager?.currentTool?.getState) {
				setDebugInfo((prev) => ({
					...prev,
					toolState: toolManager.currentTool.getState(),
				}));
			}
		};

		// Update every 100ms
		const interval = setInterval(updateToolState, 100);
		return () => clearInterval(interval);
	}, []);

	if (isMinimized) {
		return (
			<button
				type="button"
				style={{
					position: "fixed",
					top: 10,
					right: 10,
					backgroundColor: "rgba(0, 0, 0, 0.8)",
					color: "white",
					padding: "5px 10px",
					borderRadius: 4,
					fontSize: 12,
					fontFamily: "monospace",
					cursor: "pointer",
					zIndex: 10000,
					border: "none",
				}}
				onClick={() => setIsMinimized(false)}
			>
				🐛 Debug
			</button>
		);
	}

	return (
		<div
			style={{
				position: "fixed",
				top: 10,
				right: 10,
				backgroundColor: "rgba(0, 0, 0, 0.85)",
				color: "white",
				padding: 15,
				borderRadius: 8,
				fontSize: 12,
				fontFamily: "monospace",
				minWidth: 200,
				zIndex: 10000,
				boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 10,
					borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
					paddingBottom: 8,
				}}
			>
				<h3 style={{ margin: 0, fontSize: 14 }}>🐛 Debug Panel</h3>
				<button
					type="button"
					onClick={() => setIsMinimized(true)}
					style={{
						background: "none",
						border: "none",
						color: "white",
						cursor: "pointer",
						fontSize: 16,
						padding: 0,
						width: 20,
						height: 20,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					−
				</button>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				<div>
					<strong>Tool:</strong>{" "}
					<span style={{ color: "#4ade80" }}>{debugInfo.currentTool || "none"}</span>
					{debugInfo.toolState && (
						<span style={{ color: "#fbbf24", marginLeft: 8 }}>[{debugInfo.toolState}]</span>
					)}
				</div>

				<div>
					<strong>Shapes:</strong> <span style={{ color: "#60a5fa" }}>{debugInfo.shapeCount}</span>
					{debugInfo.selectedShapes > 0 && (
						<span style={{ color: "#f472b6", marginLeft: 8 }}>
							({debugInfo.selectedShapes} selected)
						</span>
					)}
				</div>

				<div>
					<strong>Canvas:</strong>{" "}
					<span style={{ color: "#a78bfa" }}>
						{debugInfo.canvasSize.width} × {debugInfo.canvasSize.height}
					</span>
				</div>

				<div>
					<strong>Mouse:</strong>{" "}
					<span style={{ color: "#fde047" }}>
						({debugInfo.mousePosition.x}, {debugInfo.mousePosition.y})
					</span>
				</div>

				{/* Additional debug info can be added here */}
				<div
					style={{
						marginTop: 10,
						paddingTop: 10,
						borderTop: "1px solid rgba(255, 255, 255, 0.2)",
						fontSize: 10,
						opacity: 0.7,
					}}
				>
					<div>Branch: feature/tool-system-extension</div>
					<div>Environment: development</div>
				</div>
			</div>
		</div>
	);
};
