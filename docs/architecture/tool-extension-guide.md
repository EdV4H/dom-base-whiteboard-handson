# Tool拡張ガイドライン

## 概要

本ドキュメントは、uSketchに新しいToolを追加する際のガイドラインと実装パターンを提供します。

## Tool作成の基本原則

### 1. 単一責任の原則
- 各Toolは1つの明確な目的を持つ
- 複雑な機能は複数のToolに分割するか、ステートマシンで管理

### 2. 一貫性のあるユーザー体験
- 既存のToolと同様の操作感を提供
- 共通のUIパターンに従う（カーソル、ショートカット等）

### 3. 拡張可能な設計
- 将来の機能追加を考慮した設計
- 他のToolとの連携を可能にする

## 新しいToolの作成手順

### Step 1: Tool仕様の定義

```typescript
interface ToolSpecification {
  id: string;                    // ユニークな識別子
  name: string;                  // 表示名
  icon?: string;                 // アイコン（emoji or SVG path）
  category: ToolCategory;        // ツールカテゴリ
  shortcuts?: string[];          // キーボードショートカット
  cursor?: string;               // カスタムカーソル
  description?: string;          // ツールの説明
}

enum ToolCategory {
  SELECTION = "selection",
  DRAWING = "drawing",
  ANNOTATION = "annotation",
  UTILITY = "utility"
}
```

### Step 2: ステートマシンの設計

```typescript
// 例: フリーハンド描画ツールのステート設計
const freehandStates = {
  idle: {
    description: "待機状態",
    transitions: {
      POINTER_DOWN: "drawing"
    }
  },
  drawing: {
    description: "描画中",
    transitions: {
      POINTER_MOVE: "drawing",
      POINTER_UP: "finalizing",
      CANCEL: "cancelled"
    }
  },
  finalizing: {
    description: "描画の最適化処理中",
    transitions: {
      COMPLETE: "idle"
    }
  }
};
```

### Step 3: Toolクラスの実装

```typescript
// packages/drawing-tools/src/tools/freehand-tool.ts
import { StatefulTool, ToolState } from "../core/stateful-tool";
import type { Point } from "@usketch/shared-types";

export class FreehandTool extends StatefulTool {
  id = "freehand";
  name = "Freehand";
  icon = "✏️";
  category = ToolCategory.DRAWING;
  
  private points: Point[] = [];
  private currentPath: SVGPathElement | null = null;
  
  protected getInitialState(): ToolState {
    return ToolState.IDLE;
  }
  
  protected defineStateMachine() {
    return {
      [ToolState.IDLE]: {
        onEnter: () => this.setCursor("crosshair"),
        transitions: {
          POINTER_DOWN: (event) => {
            this.startDrawing(event.point);
            return ToolState.DRAWING;
          }
        }
      },
      [ToolState.DRAWING]: {
        onEnter: () => this.setCursor("crosshair"),
        onExit: () => this.finalizeDrawing(),
        transitions: {
          POINTER_MOVE: (event) => {
            this.addPoint(event.point);
            return ToolState.DRAWING;
          },
          POINTER_UP: () => ToolState.IDLE,
          CANCEL: () => {
            this.cancelDrawing();
            return ToolState.IDLE;
          }
        }
      }
    };
  }
  
  private startDrawing(point: Point): void {
    this.points = [point];
    this.currentPath = this.createPathElement();
  }
  
  private addPoint(point: Point): void {
    this.points.push(point);
    this.updatePath();
  }
  
  private finalizeDrawing(): void {
    if (this.points.length > 2) {
      const smoothedPath = this.smoothPath(this.points);
      this.createShape(smoothedPath);
    }
    this.cleanup();
  }
}
```

### Step 4: Tool登録

```typescript
// packages/drawing-tools/src/index.ts
import { ToolRegistry } from "./core/tool-registry";
import { FreehandTool } from "./tools/freehand-tool";

// 自動登録デコレータを使用
@ToolRegistry.register
export class FreehandTool extends StatefulTool {
  // ...
}

// または手動登録
ToolRegistry.registerTool(new FreehandTool());
```

## 高度なToolパターン

### 1. 複合Tool（Composite Tool）

複数のサブツールを持つツール：

```typescript
class ShapeTool extends CompositeTool {
  subTools = [
    new RectangleTool(),
    new EllipseTool(),
    new PolygonTool()
  ];
  
  protected onSubToolChange(newTool: Tool): void {
    // サブツール切り替え時の処理
  }
}
```

### 2. 設定可能なTool（Configurable Tool）

```typescript
interface BrushToolConfig {
  size: number;
  opacity: number;
  smoothing: number;
  pressure: boolean;
}

class BrushTool extends ConfigurableTool<BrushToolConfig> {
  defaultConfig = {
    size: 10,
    opacity: 1,
    smoothing: 0.5,
    pressure: true
  };
  
  protected onConfigChange(config: BrushToolConfig): void {
    // 設定変更時の処理
  }
}
```

### 3. アシスト機能付きTool

```typescript
class SmartRectangleTool extends RectangleTool {
  // スナップ機能
  @withSnapping({ gridSize: 10 })
  
  // アスペクト比固定
  @withAspectRatio({ ratio: 16/9, key: "shift" })
  
  // ガイドライン表示
  @withGuidelines()
  
  // 実装
}
```

## Tool間の連携

### 1. Tool切り替えの自動化

```typescript
class QuickShapeTool extends StatefulTool {
  protected onComplete(): void {
    // 図形作成後、自動的にSelectToolに切り替え
    this.toolManager.setActiveTool("select");
    this.toolManager.selectShape(this.createdShapeId);
  }
}
```

### 2. Toolチェーン

```typescript
// テキスト付き吹き出しを作成するToolチェーン
const speechBubbleChain = new ToolChain([
  { tool: "bubble", config: { type: "speech" } },
  { tool: "text", config: { placeholder: "Enter text..." } }
]);
```

## テストガイドライン

### 1. 単体テスト

```typescript
describe("FreehandTool", () => {
  it("should transition to drawing state on pointer down", () => {
    const tool = new FreehandTool();
    tool.activate();
    
    tool.onPointerDown(mockEvent, { x: 10, y: 10 });
    
    expect(tool.currentState).toBe(ToolState.DRAWING);
  });
  
  it("should create smooth path from points", () => {
    const tool = new FreehandTool();
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 15 }
    ];
    
    const smoothed = tool.smoothPath(points);
    
    expect(smoothed).toHaveLength(greaterThan(3));
  });
});
```

### 2. 統合テスト

```typescript
describe("Tool Integration", () => {
  it("should switch from drawing to select tool", async () => {
    const manager = new ToolManager();
    
    manager.setActiveTool("rectangle");
    await drawRectangle(manager);
    
    expect(manager.getActiveTool()).toBe("select");
  });
});
```

## パフォーマンス最適化

### 1. 描画の最適化

```typescript
class OptimizedDrawingTool extends StatefulTool {
  private rafId: number | null = null;
  private pendingUpdates: Point[] = [];
  
  protected addPoint(point: Point): void {
    this.pendingUpdates.push(point);
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.processPendingUpdates();
        this.rafId = null;
      });
    }
  }
}
```

### 2. メモリ管理

```typescript
class MemoryEfficientTool extends StatefulTool {
  private maxPoints = 1000;
  
  protected addPoint(point: Point): void {
    if (this.points.length > this.maxPoints) {
      // Douglas-Peucker algorithm で点を削減
      this.points = simplifyPath(this.points, tolerance);
    }
  }
  
  protected onDeactivate(): void {
    // メモリクリーンアップ
    this.points = [];
    this.currentPath = null;
  }
}
```

## まとめ

新しいToolを作成する際は：

1. **明確な目的**を定義する
2. **ステートマシン**で状態を管理する
3. **既存のパターン**に従う
4. **テスト**を書く
5. **パフォーマンス**を考慮する

これらのガイドラインに従うことで、一貫性があり、メンテナンスしやすいToolを作成できます。