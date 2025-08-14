# 軽量ステートマシンソリューション提案

## 概要

Robot3のメンテナンス状況への懸念を踏まえ、より安定した軽量なステートマシンソリューションを提案します。

## 選択肢の再評価

### 1. 自前実装（推奨）

**メリット:**
- 完全なコントロール
- 依存関係なし
- uSketchに特化した最適化可能
- 関数型アプローチで実装可能

**実装例:**

```typescript
// packages/drawing-tools/src/core/state-machine.ts
type StateConfig<TState extends string, TContext> = {
  initial: TState;
  context: TContext;
  states: {
    [K in TState]: {
      on?: {
        [event: string]: TState | {
          target: TState;
          guard?: (context: TContext, event: any) => boolean;
          actions?: (context: TContext, event: any) => TContext;
        };
      };
      entry?: (context: TContext) => void;
      exit?: (context: TContext) => void;
    };
  };
};

export const createStateMachine = <TState extends string, TContext>(
  config: StateConfig<TState, TContext>
) => {
  let currentState = config.initial;
  let context = { ...config.context };

  const transition = (event: { type: string; [key: string]: any }) => {
    const stateConfig = config.states[currentState];
    const transition = stateConfig.on?.[event.type];

    if (!transition) return { state: currentState, context };

    const nextState = typeof transition === 'string' 
      ? transition 
      : transition.guard?.(context, event) === false 
        ? currentState 
        : transition.target;

    if (nextState !== currentState) {
      // Exit current state
      stateConfig.exit?.(context);

      // Execute transition actions
      if (typeof transition === 'object' && transition.actions) {
        context = transition.actions(context, event);
      }

      // Enter new state
      currentState = nextState;
      config.states[currentState].entry?.(context);
    }

    return { state: currentState, context };
  };

  return {
    getState: () => currentState,
    getContext: () => context,
    transition,
    matches: (state: TState) => currentState === state,
  };
};
```

### 2. Zustand拡張（既存技術活用）

既にZustandを使用しているので、それを拡張してステートマシン機能を追加：

```typescript
// packages/drawing-tools/src/core/zustand-state-machine.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type StateMachineStore<TState extends string, TContext> = {
  state: TState;
  context: TContext;
  transition: (event: string, payload?: any) => void;
  matches: (state: TState) => boolean;
};

export const createToolStateMachine = <TState extends string, TContext>(
  config: {
    initial: TState;
    context: TContext;
    transitions: Record<TState, Record<string, (ctx: TContext, payload?: any) => { state: TState; context?: Partial<TContext> }>>;
  }
) => {
  return create<StateMachineStore<TState, TContext>>()(
    immer((set, get) => ({
      state: config.initial,
      context: config.context,
      
      transition: (event, payload) => {
        const { state, context } = get();
        const handler = config.transitions[state]?.[event];
        
        if (handler) {
          const result = handler(context, payload);
          set((draft) => {
            draft.state = result.state;
            if (result.context) {
              Object.assign(draft.context, result.context);
            }
          });
        }
      },
      
      matches: (state) => get().state === state,
    }))
  );
};
```

### 3. Valtio（より軽量な状態管理）

Valtioは3KBの軽量なプロキシベース状態管理ライブラリ：

```typescript
// packages/drawing-tools/src/core/valtio-state-machine.ts
import { proxy, subscribe } from 'valtio';

export const createValtioStateMachine = <TState extends string, TContext>(config: {
  initial: TState;
  context: TContext;
  states: Record<TState, {
    on: Record<string, TState | ((ctx: TContext) => TState)>;
  }>;
}) => {
  const machine = proxy({
    state: config.initial,
    context: config.context,
    
    send(event: string, payload?: any) {
      const currentStateConfig = config.states[this.state];
      const transition = currentStateConfig?.on[event];
      
      if (transition) {
        this.state = typeof transition === 'function' 
          ? transition(this.context) 
          : transition;
      }
    }
  });

  return machine;
};
```

## 推奨実装: 自前の軽量ステートマシン

```typescript
// packages/drawing-tools/src/core/simple-state-machine.ts

// 型定義
export type StateDefinition<TState extends string, TEvent extends { type: string }> = {
  on?: {
    [K in TEvent['type']]?: TState | {
      target: TState;
      cond?: (event: Extract<TEvent, { type: K }>) => boolean;
      action?: (event: Extract<TEvent, { type: K }>) => void;
    };
  };
  entry?: () => void;
  exit?: () => void;
};

export type MachineConfig<TState extends string, TEvent extends { type: string }> = {
  id: string;
  initial: TState;
  states: Record<TState, StateDefinition<TState, TEvent>>;
};

// ステートマシン作成関数
export const createMachine = <TState extends string, TEvent extends { type: string }>(
  config: MachineConfig<TState, TEvent>
) => {
  let currentState = config.initial;
  let listeners: Array<(state: TState) => void> = [];

  const service = {
    get state() {
      return currentState;
    },

    send(event: TEvent) {
      const stateConfig = config.states[currentState];
      const transition = stateConfig.on?.[event.type];

      if (!transition) return;

      let nextState: TState;
      let shouldTransition = true;

      if (typeof transition === 'string') {
        nextState = transition;
      } else {
        if (transition.cond && !transition.cond(event as any)) {
          shouldTransition = false;
        } else {
          nextState = transition.target;
          transition.action?.(event as any);
        }
      }

      if (shouldTransition && nextState! !== currentState) {
        // Exit current state
        stateConfig.exit?.();
        
        // Transition
        currentState = nextState!;
        
        // Enter new state
        config.states[currentState].entry?.();
        
        // Notify listeners
        listeners.forEach(listener => listener(currentState));
      }
    },

    matches(state: TState) {
      return currentState === state;
    },

    subscribe(listener: (state: TState) => void) {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter(l => l !== listener);
      };
    }
  };

  // Enter initial state
  config.states[currentState].entry?.();

  return service;
};
```

## Tool実装例（自前ステートマシン使用）

```typescript
// packages/drawing-tools/src/tools/create-rectangle-tool.ts
import { createMachine } from '../core/simple-state-machine';
import { whiteboardStore } from '@usketch/store';
import type { Point } from '@usketch/shared-types';

type RectangleState = 'idle' | 'drawing' | 'complete';
type RectangleEvent = 
  | { type: 'POINTER_DOWN'; point: Point }
  | { type: 'POINTER_MOVE'; point: Point }
  | { type: 'POINTER_UP'; point: Point }
  | { type: 'CANCEL' };

export const createRectangleTool = () => {
  let startPoint: Point | null = null;
  let currentShapeId: string | null = null;

  const machine = createMachine<RectangleState, RectangleEvent>({
    id: 'rectangle',
    initial: 'idle',
    states: {
      idle: {
        entry: () => {
          const canvas = document.querySelector('.whiteboard-canvas');
          if (canvas) canvas.style.cursor = 'crosshair';
        },
        on: {
          POINTER_DOWN: {
            target: 'drawing',
            action: (event) => {
              startPoint = event.point;
              currentShapeId = `rect-${Date.now()}`;
              whiteboardStore.getState().addShape({
                id: currentShapeId,
                type: 'rectangle',
                x: event.point.x,
                y: event.point.y,
                width: 0,
                height: 0,
                rotation: 0,
                opacity: 1,
                strokeColor: '#333333',
                fillColor: '#ffffff',
                strokeWidth: 2,
              });
            }
          }
        }
      },
      drawing: {
        on: {
          POINTER_MOVE: {
            target: 'drawing',
            action: (event) => {
              if (!startPoint || !currentShapeId) return;
              
              const width = event.point.x - startPoint.x;
              const height = event.point.y - startPoint.y;
              
              whiteboardStore.getState().updateShape(currentShapeId, {
                x: width < 0 ? event.point.x : startPoint.x,
                y: height < 0 ? event.point.y : startPoint.y,
                width: Math.abs(width),
                height: Math.abs(height),
              });
            }
          },
          POINTER_UP: {
            target: 'complete',
            action: () => {
              // 小さすぎる矩形は削除
              if (currentShapeId) {
                const shape = whiteboardStore.getState().shapes[currentShapeId];
                if (shape && 'width' in shape && shape.width < 5 && shape.height < 5) {
                  whiteboardStore.getState().removeShape(currentShapeId);
                }
              }
            }
          },
          CANCEL: {
            target: 'idle',
            action: () => {
              if (currentShapeId) {
                whiteboardStore.getState().removeShape(currentShapeId);
              }
            }
          }
        }
      },
      complete: {
        entry: () => {
          startPoint = null;
          currentShapeId = null;
        },
        on: {
          POINTER_DOWN: 'idle'
        }
      }
    }
  });

  return {
    id: 'rectangle',
    name: 'Rectangle Tool',
    icon: '□',
    machine,
    
    // ToolManagerとの統合用メソッド
    handlePointerDown: (point: Point) => machine.send({ type: 'POINTER_DOWN', point }),
    handlePointerMove: (point: Point) => machine.send({ type: 'POINTER_MOVE', point }),
    handlePointerUp: (point: Point) => machine.send({ type: 'POINTER_UP', point }),
    handleKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Escape') machine.send({ type: 'CANCEL' });
    }
  };
};
```

## まとめ

### 推奨アプローチ

1. **自前実装のシンプルなステートマシン**
   - 200行程度で実装可能
   - 完全なコントロール
   - 依存関係なし
   - TypeScript完全対応

2. **段階的な拡張**
   - 最初はシンプルに開始
   - 必要に応じて機能追加
   - 将来的にXStateへの移行も可能

3. **関数型アプローチの維持**
   - クラスを使わない設計
   - 純粋関数とコンポジション
   - テストしやすい構造

この方法により、外部依存なしで安定した軽量なステートマシンを実現できます。