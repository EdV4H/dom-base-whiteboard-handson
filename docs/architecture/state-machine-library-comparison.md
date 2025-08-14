# ステートマシンライブラリ比較: XState vs Robot vs その他

## 概要

uSketchのToolシステムに最適なステートマシンライブラリを選定するための比較分析です。

## 主要ライブラリ比較

### 1. XState

**バンドルサイズ**: 16.7KB (minified + gzipped)

**特徴**:
- ✅ 業界標準、豊富なエコシステム
- ✅ TypeScript完全サポート
- ✅ ビジュアライザーツール
- ✅ SCXML仕様準拠
- ✅ 階層的ステートマシン
- ✅ アクターモデルサポート
- ❌ 比較的大きなバンドルサイズ
- ❌ 学習曲線が急

**使用例**:
```typescript
import { createMachine, interpret } from 'xstate';

const toolMachine = createMachine({
  id: 'tool',
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'active' }
    },
    active: {
      on: { STOP: 'idle' }
    }
  }
});
```

### 2. Robot

**バンドルサイズ**: 1.2KB (minified + gzipped)

**特徴**:
- ✅ 超軽量
- ✅ 関数型API
- ✅ シンプルで直感的
- ✅ コンポジション容易
- ❌ 階層的ステートなし
- ❌ ビジュアライザーなし
- ❌ 機能が限定的

**使用例**:
```typescript
import { createMachine, state, transition } from 'robot3';

const toolMachine = createMachine({
  idle: state(
    transition('START', 'active')
  ),
  active: state(
    transition('STOP', 'idle')
  )
});
```

### 3. その他の選択肢

#### Zag (Chakra UIチーム)

**バンドルサイズ**: ~5KB

**特徴**:
- ✅ UIコンポーネント特化
- ✅ アクセシビリティ重視
- ✅ React/Vue/Solid対応

```typescript
import { createMachine } from '@zag-js/core';

const toolMachine = createMachine({
  id: "tool",
  initial: "idle",
  states: {
    idle: {
      on: { START: "active" }
    },
    active: {
      on: { STOP: "idle" }
    }
  }
});
```

#### ts-fsm

**バンドルサイズ**: ~2KB

**特徴**:
- ✅ TypeScript特化
- ✅ 型安全性最重視
- ✅ 軽量

## uSketch Toolシステムへの推奨

### 推奨: Robot + カスタム拡張

**理由**:

1. **軽量性**: DOMベースのホワイトボードライブラリとして、パフォーマンスが重要
2. **関数型**: クラスを使わない方針に合致
3. **拡張可能**: 必要な機能は自前で実装可能
4. **シンプル**: Toolの状態管理には十分な機能

### 実装方針

```typescript
// packages/drawing-tools/src/core/enhanced-robot.ts
import { createMachine as createRobotMachine, state, transition } from 'robot3';

// Robotを拡張してコンテキスト機能を追加
export const createMachine = <TContext>(config: {
  id: string;
  context: TContext;
  states: Record<string, any>;
}) => {
  let context = config.context;
  
  const machine = createRobotMachine(config.states);
  
  return {
    machine,
    context,
    updateContext: (updater: (ctx: TContext) => TContext) => {
      context = updater(context);
    },
    getContext: () => context
  };
};

// 高階関数でアクション機能を追加
export const withActions = <T>(
  stateDef: any,
  actions: Record<string, (context: T, event: any) => void>
) => {
  return {
    ...stateDef,
    effect: (context: T, event: any) => {
      const action = actions[event.type];
      if (action) action(context, event);
    }
  };
};
```

### Tool実装例（Robot使用）

```typescript
// packages/drawing-tools/src/tools/rectangle-tool-robot.ts
import { state, transition, guard } from 'robot3';
import { createMachine, withActions } from '../core/enhanced-robot';

interface RectangleContext {
  startPoint: Point | null;
  currentShapeId: string | null;
}

const createRectangleTool = () => {
  const machine = createMachine<RectangleContext>({
    id: 'rectangle',
    context: {
      startPoint: null,
      currentShapeId: null
    },
    states: {
      idle: withActions(
        state(
          transition('POINTER_DOWN', 'drawing', 
            // カスタムアクション
            (ctx, evt) => ({ 
              ...ctx, 
              startPoint: evt.point,
              currentShapeId: createShape(evt.point)
            })
          )
        ),
        {
          enter: () => setCursor('crosshair')
        }
      ),
      
      drawing: withActions(
        state(
          transition('POINTER_MOVE', 'drawing',
            (ctx, evt) => updateShape(ctx.currentShapeId, evt.point)
          ),
          transition('POINTER_UP', 'idle',
            (ctx) => finalizeShape(ctx.currentShapeId)
          ),
          transition('ESCAPE', 'idle',
            (ctx) => cancelShape(ctx.currentShapeId)
          )
        ),
        {
          POINTER_MOVE: (ctx, evt) => updateDrawing(ctx, evt.point)
        }
      )
    }
  });
  
  return machine;
};
```

### パフォーマンスを考慮した実装

```typescript
// メモ化とバッチ処理を組み合わせた最適化
export const createOptimizedTool = (toolDef: ToolDefinition) => {
  let pendingUpdates: Point[] = [];
  let rafId: number | null = null;
  
  const batchedUpdate = () => {
    if (pendingUpdates.length > 0) {
      // 最後の点のみを処理（中間点は視覚的に不要）
      const lastPoint = pendingUpdates[pendingUpdates.length - 1];
      toolDef.onUpdateDrawing?.(lastPoint);
      pendingUpdates = [];
    }
    rafId = null;
  };
  
  return {
    ...toolDef,
    onUpdateDrawing: (point: Point) => {
      pendingUpdates.push(point);
      if (!rafId) {
        rafId = requestAnimationFrame(batchedUpdate);
      }
    }
  };
};
```

## 移行計画

### Phase 1: Robot導入と拡張（1週間）
```bash
pnpm add robot3
```
- enhanced-robot.tsの実装
- 基本的なTool作成関数

### Phase 2: 既存Toolの移行（1週間）
- RectangleToolをRobotベースに移行
- SelectToolをRobotベースに移行
- テストの更新

### Phase 3: 必要に応じてXStateへの移行検討
- もし階層的ステートが必要になった場合
- ビジュアライザーが必要になった場合

## まとめ

uSketchのニーズを考慮すると、Robotの軽量性と関数型アプローチが最適です。必要な機能は自前で拡張し、将来的により高度な機能が必要になった場合はXStateへの移行も可能です。