# Zag.js 評価レポート - uSketch Toolシステムへの適用可能性

## Zag.js 概要

Zag.jsはChakra UIチームが開発する、UIコンポーネント用のステートマシンライブラリです。

### 主要特徴

- **フレームワークに依存しない**: React、Vue、Solid、Svelte、Vanilla JSに対応
- **アクセシビリティ重視**: WAI-ARIA準拠
- **TypeScript完全対応**: 84.7%がTypeScriptで実装
- **アクティブな開発**: 4.7k GitHub stars、5,000以上のリリース

## uSketch Toolシステムへの適合性評価

### ✅ 利点

1. **UIとの緊密な統合**
   ```typescript
   // Zag.jsの使用例
   import * as toggle from "@zag-js/toggle"
   
   const machine = toggle.machine({ id: "1" })
   const api = toggle.connect(machine.state, machine.send)
   
   // UI要素に直接バインド
   <button {...api.buttonProps}>
     {api.isPressed ? "Pressed" : "Not Pressed"}
   </button>
   ```

2. **軽量で理解しやすい設計**
   - 複雑なステートマシン概念（spawn、ネストなど）を避けた設計
   - 各コンポーネントは独立したnpmパッケージ

3. **優れた開発体験**
   - 型安全性
   - 段階的な導入が可能

### ❌ 制限事項

1. **UIコンポーネント特化**
   - Toolのような汎用的なステート管理には最適化されていない
   - 主にメニュー、ダイアログ、アコーディオンなどのUI要素用

2. **描画ツール用の機能不足**
   - キャンバス操作やドローイングツール用のプリミティブなし
   - ポインターイベントの複雑な処理には不向き

3. **カスタマイズの制約**
   - UIコンポーネントパターンに特化した設計
   - Toolの複雑な状態遷移には柔軟性が不足

## uSketch向けカスタムソリューション

Zag.jsのアプローチを参考にしつつ、Toolシステムに特化した実装を提案：

```typescript
// packages/drawing-tools/src/core/tool-machine.ts
import { createMachine, createActor } from '@zag-js/core';

// Zag.jsスタイルのTool定義
export const createToolMachine = (config: {
  id: string;
  initial: string;
  context: any;
  states: Record<string, any>;
}) => {
  return createMachine(config, {
    actions: {
      setCursor: (ctx, evt) => {
        const canvas = document.querySelector('.whiteboard-canvas');
        if (canvas) canvas.style.cursor = evt.cursor;
      },
      startDrawing: (ctx, evt) => {
        // 描画開始ロジック
      },
      updateDrawing: (ctx, evt) => {
        // 描画更新ロジック
      }
    }
  });
};

// React統合用Hook
export const useToolMachine = (machine: any) => {
  const [state, send] = useMachine(machine);
  
  return {
    state,
    send,
    api: {
      handlePointerDown: (e: PointerEvent) => send({ type: 'POINTER_DOWN', event: e }),
      handlePointerMove: (e: PointerEvent) => send({ type: 'POINTER_MOVE', event: e }),
      handlePointerUp: (e: PointerEvent) => send({ type: 'POINTER_UP', event: e }),
      isActive: state.matches('active'),
      isDrawing: state.matches('drawing')
    }
  };
};
```

## ハイブリッドアプローチの提案

### 1. UIコンポーネントにはZag.js

```typescript
// ツールバーやパネルなどのUIコンポーネント
import * as menu from "@zag-js/menu";
import * as dialog from "@zag-js/dialog";
import * as toggle from "@zag-js/toggle";

// ツール選択メニュー
const toolMenuMachine = menu.machine({
  id: "tool-menu",
  onSelect: (details) => {
    toolManager.setActiveTool(details.value);
  }
});
```

### 2. Toolロジックには軽量カスタム実装

```typescript
// packages/drawing-tools/src/core/lightweight-tool-machine.ts
type ToolMachineConfig<TState extends string, TContext> = {
  id: string;
  initial: TState;
  context: TContext;
  states: {
    [K in TState]: {
      on?: Record<string, TState>;
      entry?: (ctx: TContext) => void;
      exit?: (ctx: TContext) => void;
      activities?: string[];
    };
  };
};

export const createToolStateMachine = <TState extends string, TContext>(
  config: ToolMachineConfig<TState, TContext>
) => {
  let currentState = config.initial;
  let context = { ...config.context };
  
  const service = {
    state: currentState,
    context,
    
    send(event: string, payload?: any) {
      const stateConfig = config.states[currentState];
      const nextState = stateConfig.on?.[event];
      
      if (nextState && nextState !== currentState) {
        stateConfig.exit?.(context);
        currentState = nextState;
        config.states[currentState].entry?.(context);
      }
    },
    
    matches(state: TState) {
      return currentState === state;
    }
  };
  
  return service;
};
```

## 実装推奨事項

### 段階的アプローチ

1. **Phase 1**: UIコンポーネント（ツールバー、メニュー）にZag.jsを導入
2. **Phase 2**: Toolロジック用の軽量ステートマシンを実装
3. **Phase 3**: 必要に応じて両者を統合

### 技術スタック案

```json
{
  "dependencies": {
    "@zag-js/core": "^0.x.x",        // コア機能のみ
    "@zag-js/menu": "^0.x.x",        // メニューUI用
    "@zag-js/toggle": "^0.x.x",      // トグルボタン用
    "@zag-js/react": "^0.x.x"        // React統合（必要な場合）
  }
}
```

## 結論

Zag.jsは優れたUIコンポーネントライブラリですが、uSketchのToolシステムには以下の理由で部分的な採用を推奨：

1. **UI部分**: Zag.jsを活用（メニュー、ツールバー、パネル）
2. **Toolロジック**: カスタム軽量実装（200行程度）
3. **メリット**: 
   - UIは実績あるソリューション活用
   - Toolロジックは完全なコントロール
   - 全体的に軽量を維持

この方法により、Zag.jsの優れたUI機能を活かしつつ、Toolシステムに必要な柔軟性を確保できます。