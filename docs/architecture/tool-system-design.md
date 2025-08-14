# Tool システム拡張設計書

## 概要

uSketchのToolシステムを、柔軟性と拡張性を持たせながら、共通のステートマシンを持つように再設計します。

## 現状分析

### 現在の実装

- `Tool`インターフェースと`BaseTool`抽象クラスによる基本構造
- `ToolManager`による中央集権的な管理
- 各ツールが独自に状態管理（SelectToolのドラッグ状態、RectangleToolの描画状態など）
- イベントハンドラによる単純な処理フロー

### 課題

1. **状態管理の不統一**: 各ツールが独自に状態を管理し、共通パターンがない
2. **拡張性の制限**: 新しいツールを追加する際の規約が不明確
3. **複雑な操作への対応不足**: マルチステップ操作や条件分岐を伴う操作が困難

## 設計方針

### 1. ステートマシンベースのアーキテクチャ

各ツールに共通のステートマシンを実装し、状態遷移を明確に定義します。

```typescript
// 基本的な状態定義
enum ToolState {
  IDLE = "idle",
  ACTIVE = "active",
  DRAGGING = "dragging",
  DRAWING = "drawing",
  EDITING = "editing",
  PREVIEW = "preview",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

// 状態遷移イベント
type StateTransitionEvent = 
  | { type: "ACTIVATE" }
  | { type: "DEACTIVATE" }
  | { type: "POINTER_DOWN"; point: Point; event: PointerEvent }
  | { type: "POINTER_MOVE"; point: Point; event: PointerEvent }
  | { type: "POINTER_UP"; point: Point; event: PointerEvent }
  | { type: "KEY_DOWN"; key: string; event: KeyboardEvent }
  | { type: "KEY_UP"; key: string; event: KeyboardEvent }
  | { type: "COMPLETE" }
  | { type: "CANCEL" }
```

### 2. 拡張可能なToolベースクラス

```typescript
abstract class StatefulTool extends BaseTool {
  protected currentState: ToolState = ToolState.IDLE;
  protected stateData: Map<string, any> = new Map();
  
  // ステートマシンの定義
  protected abstract stateMachine: StateMachine<ToolState, StateTransitionEvent>;
  
  // 状態固有の処理
  protected abstract handleStateEntry(state: ToolState): void;
  protected abstract handleStateExit(state: ToolState): void;
  protected abstract handleStateAction(state: ToolState, event: StateTransitionEvent): void;
  
  // 共通の状態遷移ロジック
  protected transition(event: StateTransitionEvent): void {
    const nextState = this.stateMachine.transition(this.currentState, event);
    if (nextState !== this.currentState) {
      this.handleStateExit(this.currentState);
      this.currentState = nextState;
      this.handleStateEntry(this.currentState);
    }
    this.handleStateAction(this.currentState, event);
  }
}
```

### 3. Tool作成のためのヘルパー関数とデコレータ

```typescript
// Toolの定義を簡潔にするためのビルダーパターン
class ToolBuilder {
  static create(config: ToolConfig) {
    return class extends StatefulTool {
      id = config.id;
      name = config.name;
      icon = config.icon;
      
      protected stateMachine = config.stateMachine;
      
      protected handleStateEntry = config.onStateEntry || (() => {});
      protected handleStateExit = config.onStateExit || (() => {});
      protected handleStateAction = config.onStateAction || (() => {});
    };
  }
}

// 使用例
const PenTool = ToolBuilder.create({
  id: "pen",
  name: "Pen Tool",
  icon: "✏️",
  stateMachine: new StateMachine({
    idle: {
      POINTER_DOWN: "drawing"
    },
    drawing: {
      POINTER_MOVE: "drawing",
      POINTER_UP: "completed",
      CANCEL: "cancelled"
    },
    completed: {
      ACTIVATE: "idle"
    }
  }),
  onStateEntry(state) {
    switch(state) {
      case "drawing":
        // 描画開始処理
        break;
    }
  }
});
```

### 4. Toolの登録と管理

```typescript
// Tool登録のデコレータ
function registerTool(toolId: string) {
  return function(target: any) {
    ToolRegistry.register(toolId, target);
  };
}

// 使用例
@registerTool("ellipse")
class EllipseTool extends StatefulTool {
  // 実装
}
```

### 5. 共通機能の実装

```typescript
// 共通のTool機能をmixinとして提供
const withSnapping = (Base: typeof StatefulTool) => {
  return class extends Base {
    protected snapToGrid(point: Point): Point {
      // グリッドスナップロジック
    }
  };
};

const withConstraints = (Base: typeof StatefulTool) => {
  return class extends Base {
    protected constrainAspectRatio(width: number, height: number): { width: number, height: number } {
      // アスペクト比制約ロジック
    }
  };
};

// 使用例
class ConstrainedRectangleTool extends withConstraints(withSnapping(StatefulTool)) {
  // Shiftキーでアスペクト比固定、グリッドスナップ機能付き
}
```

## 実装例

### SelectTool with State Machine

```typescript
class SelectTool extends StatefulTool {
  id = "select";
  name = "Select";
  
  protected stateMachine = new StateMachine({
    [ToolState.IDLE]: {
      POINTER_DOWN: (event, data) => {
        if (data.targetShape) {
          return ToolState.DRAGGING;
        }
        return ToolState.IDLE;
      }
    },
    [ToolState.DRAGGING]: {
      POINTER_MOVE: ToolState.DRAGGING,
      POINTER_UP: ToolState.IDLE,
      CANCEL: ToolState.IDLE
    }
  });
  
  protected handleStateEntry(state: ToolState): void {
    switch(state) {
      case ToolState.DRAGGING:
        this.setCursor("grabbing");
        break;
      case ToolState.IDLE:
        this.setCursor("default");
        break;
    }
  }
  
  protected handleStateAction(state: ToolState, event: StateTransitionEvent): void {
    switch(state) {
      case ToolState.DRAGGING:
        if (event.type === "POINTER_MOVE") {
          this.updateShapePosition(event.point);
        }
        break;
    }
  }
}
```

## 拡張計画

### フェーズ1: 基本実装

1. ステートマシン基盤の実装
2. StatefulToolベースクラスの実装
3. 既存ツール（Select, Rectangle）の移行

### フェーズ2: 追加ツール

1. 楕円ツール（Ellipse Tool）
2. 直線ツール（Line Tool）
3. ペンツール（Pen Tool）
4. テキストツール（Text Tool）

### フェーズ3: 高度な機能

1. 複合ツール（Multi-step Tools）
2. カスタムツールAPI
3. ツールプリセット機能
4. ツール設定UI

## まとめ

この設計により、以下が実現されます：

- **統一された状態管理**: すべてのツールが同じステートマシンパターンに従う
- **高い拡張性**: 新しいツールの追加が容易
- **再利用可能な機能**: mixin やデコレータによる共通機能の提供
- **明確な設計パターン**: 開発者が新しいツールを作る際の明確なガイドライン