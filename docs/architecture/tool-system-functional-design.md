# Tool システム関数型設計書

## 概要

クラスベースの設計から関数型アプローチへの転換し、既存のステートマシンライブラリを活用した設計案です。

## ステートマシンライブラリの比較

### 1. XState (推奨)

**特徴:**
- 業界標準のステートマシンライブラリ
- TypeScript完全サポート
- 豊富なエコシステム
- ビジュアライザーツール

```typescript
import { createMachine, interpret } from 'xstate';

// XStateでのTool定義例
const selectToolMachine = createMachine({
  id: 'selectTool',
  initial: 'idle',
  context: {
    selectedShapes: [],
    dragStart: null
  },
  states: {
    idle: {
      on: {
        POINTER_DOWN: {
          target: 'selecting',
          actions: 'startSelection'
        }
      }
    },
    selecting: {
      on: {
        POINTER_MOVE: {
          target: 'dragging',
          cond: 'hasSelectedShape'
        },
        POINTER_UP: {
          target: 'idle',
          actions: 'completeSelection'
        }
      }
    },
    dragging: {
      on: {
        POINTER_MOVE: {
          actions: 'updateDragPosition'
        },
        POINTER_UP: {
          target: 'idle',
          actions: 'completeDrag'
        }
      }
    }
  }
});
```

### 2. Robot

**特徴:**
- 軽量（3KB）
- シンプルなAPI
- 関数型アプローチ

```typescript
import { createMachine, state, transition } from 'robot3';

const selectToolMachine = createMachine({
  idle: state(
    transition('POINTER_DOWN', 'selecting')
  ),
  selecting: state(
    transition('POINTER_MOVE', 'dragging', guard(hasSelectedShape)),
    transition('POINTER_UP', 'idle')
  ),
  dragging: state(
    transition('POINTER_MOVE', 'dragging'),
    transition('POINTER_UP', 'idle')
  )
});
```

### 3. ts-fsm

**特徴:**
- TypeScript特化
- 型安全性重視
- 軽量

## 関数型Tool設計（XState使用）

### 基本的なTool定義

```typescript
// packages/drawing-tools/src/tools/create-tool.ts
import { createMachine, assign, StateMachine } from 'xstate';
import type { Point } from '@usketch/shared-types';

// Tool定義の型
interface ToolDefinition {
  id: string;
  name: string;
  icon?: string;
  cursor?: string;
  machine: StateMachine<any, any, any>;
  actions: ToolActions;
}

// Toolアクション定義
interface ToolActions {
  onActivate?: () => void;
  onDeactivate?: () => void;
  onStartDrawing?: (point: Point) => void;
  onUpdateDrawing?: (point: Point) => void;
  onCompleteDrawing?: () => void;
  onCancelDrawing?: () => void;
}

// Tool作成関数
export const createTool = (definition: ToolDefinition) => {
  const { id, name, icon, cursor, machine, actions } = definition;
  
  // XStateマシンにアクションを注入
  const toolMachine = machine.withConfig({
    actions: {
      activate: () => actions.onActivate?.(),
      deactivate: () => actions.onDeactivate?.(),
      startDrawing: (_, event) => actions.onStartDrawing?.(event.point),
      updateDrawing: (_, event) => actions.onUpdateDrawing?.(event.point),
      completeDrawing: () => actions.onCompleteDrawing?.(),
      cancelDrawing: () => actions.onCancelDrawing?.()
    }
  });
  
  return {
    id,
    name,
    icon,
    cursor,
    machine: toolMachine,
    
    // 便利なヘルパー関数
    createService: () => interpret(toolMachine),
    
    // イベント送信ヘルパー
    sendEvent: (service: any, eventType: string, data?: any) => {
      service.send({ type: eventType, ...data });
    }
  };
};
```

### 具体的なTool実装例

```typescript
// packages/drawing-tools/src/tools/rectangle-tool.ts
import { createMachine } from 'xstate';
import { createTool } from './create-tool';
import { whiteboardStore } from '@usketch/store';

// 矩形ツールのコンテキスト型
interface RectangleContext {
  startPoint: Point | null;
  currentShapeId: string | null;
  preview: boolean;
}

// 矩形ツールマシン定義
const rectangleMachine = createMachine<RectangleContext>({
  id: 'rectangle',
  initial: 'idle',
  context: {
    startPoint: null,
    currentShapeId: null,
    preview: false
  },
  states: {
    idle: {
      entry: 'activate',
      on: {
        POINTER_DOWN: {
          target: 'drawing',
          actions: ['startDrawing', 'createShape']
        }
      }
    },
    drawing: {
      on: {
        POINTER_MOVE: {
          actions: 'updateDrawing'
        },
        POINTER_UP: {
          target: 'idle',
          actions: 'completeDrawing'
        },
        ESCAPE: {
          target: 'idle',
          actions: 'cancelDrawing'
        }
      }
    }
  }
});

// 矩形ツール作成
export const rectangleTool = createTool({
  id: 'rectangle',
  name: 'Rectangle',
  icon: '□',
  cursor: 'crosshair',
  machine: rectangleMachine,
  actions: {
    onActivate: () => {
      const canvas = document.querySelector('.whiteboard-canvas');
      if (canvas) canvas.style.cursor = 'crosshair';
    },
    
    onStartDrawing: (point) => {
      const shapeId = `rect-${Date.now()}`;
      whiteboardStore.getState().addShape({
        id: shapeId,
        type: 'rectangle',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        rotation: 0,
        opacity: 1,
        strokeColor: '#333333',
        fillColor: '#ffffff',
        strokeWidth: 2
      });
      return shapeId;
    },
    
    onUpdateDrawing: (point) => {
      const context = rectangleMachine.context;
      if (!context.startPoint || !context.currentShapeId) return;
      
      const width = point.x - context.startPoint.x;
      const height = point.y - context.startPoint.y;
      
      whiteboardStore.getState().updateShape(context.currentShapeId, {
        x: width < 0 ? point.x : context.startPoint.x,
        y: height < 0 ? point.y : context.startPoint.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    },
    
    onCompleteDrawing: () => {
      // 完了処理
    },
    
    onCancelDrawing: () => {
      const context = rectangleMachine.context;
      if (context.currentShapeId) {
        whiteboardStore.getState().removeShape(context.currentShapeId);
      }
    }
  }
});
```

### 高階関数によるTool拡張

```typescript
// packages/drawing-tools/src/enhancers/with-snapping.ts
import type { ToolDefinition } from '../tools/create-tool';

interface SnapConfig {
  gridSize: number;
  enabled: boolean;
}

export const withSnapping = (config: SnapConfig) => (tool: ToolDefinition): ToolDefinition => {
  const originalOnUpdateDrawing = tool.actions.onUpdateDrawing;
  
  return {
    ...tool,
    actions: {
      ...tool.actions,
      onUpdateDrawing: (point) => {
        if (config.enabled) {
          const snappedPoint = {
            x: Math.round(point.x / config.gridSize) * config.gridSize,
            y: Math.round(point.y / config.gridSize) * config.gridSize
          };
          originalOnUpdateDrawing?.(snappedPoint);
        } else {
          originalOnUpdateDrawing?.(point);
        }
      }
    }
  };
};

// 使用例
const snappingRectangleTool = withSnapping({ gridSize: 10, enabled: true })(rectangleTool);
```

### コンポジション関数

```typescript
// packages/drawing-tools/src/enhancers/compose.ts
export const compose = (...enhancers: Array<(tool: ToolDefinition) => ToolDefinition>) => 
  (tool: ToolDefinition): ToolDefinition => 
    enhancers.reduceRight((acc, enhancer) => enhancer(acc), tool);

// 複数の拡張を組み合わせる
const enhancedRectangleTool = compose(
  withSnapping({ gridSize: 10, enabled: true }),
  withConstraints({ aspectRatio: true, shiftKey: true }),
  withHistory({ maxSteps: 50 }),
  withShortcuts({ activate: 'r', cancel: 'escape' })
)(rectangleTool);
```

### ToolManager（関数型）

```typescript
// packages/drawing-tools/src/tool-manager.ts
import { interpret, Interpreter } from 'xstate';
import type { ToolDefinition } from './tools/create-tool';

interface ToolManagerState {
  tools: Map<string, ToolDefinition>;
  activeToolId: string | null;
  activeService: Interpreter<any> | null;
}

// 状態管理をpure関数で
export const createToolManager = () => {
  let state: ToolManagerState = {
    tools: new Map(),
    activeToolId: null,
    activeService: null
  };
  
  const registerTool = (tool: ToolDefinition) => {
    state.tools.set(tool.id, tool);
  };
  
  const setActiveTool = (toolId: string) => {
    // 現在のツールを停止
    if (state.activeService) {
      state.activeService.stop();
    }
    
    const tool = state.tools.get(toolId);
    if (!tool) {
      console.warn(`Tool ${toolId} not found`);
      return;
    }
    
    // 新しいツールを開始
    const service = interpret(tool.machine).start();
    
    state = {
      ...state,
      activeToolId: toolId,
      activeService: service
    };
    
    // ストアを更新
    whiteboardStore.setState({ currentTool: toolId });
  };
  
  const handlePointerEvent = (eventType: string, point: Point, event: PointerEvent) => {
    if (state.activeService) {
      state.activeService.send({
        type: eventType,
        point,
        event
      });
    }
  };
  
  return {
    registerTool,
    setActiveTool,
    handlePointerDown: (point: Point, event: PointerEvent) => 
      handlePointerEvent('POINTER_DOWN', point, event),
    handlePointerMove: (point: Point, event: PointerEvent) => 
      handlePointerEvent('POINTER_MOVE', point, event),
    handlePointerUp: (point: Point, event: PointerEvent) => 
      handlePointerEvent('POINTER_UP', point, event),
    getTools: () => Array.from(state.tools.values()),
    getActiveTool: () => state.activeToolId
  };
};
```

### React Hookとの統合

```typescript
// packages/drawing-tools/src/hooks/use-tool.ts
import { useEffect, useState } from 'react';
import { useActor } from '@xstate/react';
import type { ToolDefinition } from '../tools/create-tool';

export const useTool = (tool: ToolDefinition) => {
  const [service] = useState(() => interpret(tool.machine));
  const [state, send] = useActor(service);
  
  useEffect(() => {
    service.start();
    return () => service.stop();
  }, [service]);
  
  return {
    state,
    send,
    isActive: state.matches('active'),
    isDrawing: state.matches('drawing'),
    context: state.context
  };
};
```

## 利点

### 1. **型安全性**
XStateは優れた型推論を提供し、イベントと状態の型安全性を保証

### 2. **テスタビリティ**
純粋関数とステートマシンの組み合わせにより、テストが容易

### 3. **可視化**
XStateのビジュアライザーで状態遷移を視覚的に確認可能

### 4. **コンポジション**
高階関数によるToolの拡張が自然に表現できる

### 5. **副作用の分離**
ステートマシンのロジックと副作用（DOM操作等）が明確に分離

## 移行計画

1. **XStateの導入**
   ```bash
   pnpm add xstate @xstate/react
   ```

2. **基本Tool関数の実装**
   - createTool関数
   - 基本的なenhancer関数

3. **既存Toolの段階的移行**
   - まずRectangleToolから開始
   - 動作確認後、SelectToolを移行

4. **クラスベースAPIの廃止**
   - 関数型APIが安定したら、旧APIを削除

この設計により、より関数型でコンポーザブルなToolシステムが実現できます。