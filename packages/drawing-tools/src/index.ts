// Core exports (new functional API)
export * from "./core";
// Legacy exports (kept for backward compatibility)
export { RectangleTool } from "./rectangle-tool";
export { SelectTool } from "./select-tool";
export type { Tool } from "./tool";
export { BaseTool } from "./tool";
// Adapter for using functional tools with legacy system
export { ToolAdapter } from "./tool-adapter";
export { ToolManager } from "./tool-manager";
// Hybrid ToolManager for gradual migration
export { ToolManagerHybrid } from "./tool-manager-hybrid";
export type { ToolManager as ToolManagerV2 } from "./tool-manager-v2";
// Tool Manager v2
export { createToolManager } from "./tool-manager-v2";
// Tool exports (new functional implementations)
export * from "./tools";
