# Tool システム実装計画

## 概要

本ドキュメントは、uSketchのToolシステムを拡張可能でステートマシンベースのアーキテクチャに移行するための段階的な実装計画です。

## 実装フェーズ

### Phase 1: 基盤実装（1-2週間）

#### 1.1 ステートマシン基盤の実装

**ファイル**: `packages/drawing-tools/src/core/state-machine.ts`

```typescript
// 実装タスク
- [ ] StateMachine クラスの実装
- [ ] StateTransition インターフェースの定義
- [ ] StateHandler の実装
- [ ] イベントシステムの実装
```

#### 1.2 StatefulTool ベースクラス

**ファイル**: `packages/drawing-tools/src/core/stateful-tool.ts`

```typescript
// 実装タスク
- [ ] StatefulTool 抽象クラスの実装
- [ ] 状態遷移メソッドの実装
- [ ] イベントハンドリングの統合
- [ ] カーソル管理の実装
```

#### 1.3 Tool Registry システム

**ファイル**: `packages/drawing-tools/src/core/tool-registry.ts`

```typescript
// 実装タスク
- [ ] ToolRegistry クラスの実装
- [ ] 自動登録デコレータの実装
- [ ] Tool検索・フィルタリング機能
- [ ] カテゴリ管理
```

### Phase 2: 既存Toolの移行（1週間）

#### 2.1 SelectTool の移行

```typescript
// タスク
- [ ] SelectTool をStatefulToolに移行
- [ ] 状態定義（idle, selecting, dragging）
- [ ] 複数選択のサポート
- [ ] テストの更新
```

#### 2.2 RectangleTool の移行

```typescript
// タスク
- [ ] RectangleTool をStatefulToolに移行
- [ ] 状態定義（idle, drawing, resizing）
- [ ] アスペクト比固定機能の追加
- [ ] テストの更新
```

### Phase 3: 共通機能の実装（1週間）

#### 3.1 Mixin システム

**ファイル**: `packages/drawing-tools/src/mixins/`

```typescript
// 実装予定のMixin
- [ ] withSnapping - グリッドスナップ機能
- [ ] withConstraints - 制約機能（アスペクト比など）
- [ ] withGuidelines - ガイドライン表示
- [ ] withHistory - Undo/Redo統合
- [ ] withShortcuts - キーボードショートカット
```

#### 3.2 Tool設定システム

**ファイル**: `packages/drawing-tools/src/core/tool-config.ts`

```typescript
// タスク
- [ ] ConfigurableTool ベースクラス
- [ ] 設定の永続化
- [ ] 設定UIの自動生成
- [ ] プリセット機能
```

### Phase 4: 新規Tool実装（2週間）

#### 4.1 基本図形Tool

```typescript
// 実装予定のTool
- [ ] EllipseTool - 楕円描画
- [ ] LineTool - 直線描画
- [ ] PolygonTool - 多角形描画
- [ ] ArrowTool - 矢印描画
```

#### 4.2 高度なTool

```typescript
// 実装予定のTool
- [ ] PenTool - フリーハンド描画
- [ ] TextTool - テキスト入力
- [ ] EraserTool - 消しゴム
- [ ] PanTool - 画面移動専用
```

### Phase 5: Tool UI/UX改善（1週間）

#### 5.1 Toolバーコンポーネント

```typescript
// タスク
- [ ] ToolbarコンポーネントのReact版
- [ ] ToolbarコンポーネントのVanilla JS版
- [ ] Tool切り替えアニメーション
- [ ] ツールチップ表示
```

#### 5.2 コンテキストメニュー

```typescript
// タスク
- [ ] 右クリックメニューの実装
- [ ] Tool固有のアクション
- [ ] ショートカット表示
```

## 技術的な実装詳細

### ステートマシンの実装例

```typescript
// packages/drawing-tools/src/core/state-machine.ts
export class StateMachine<TState, TEvent> {
  private currentState: TState;
  private transitions: Map<TState, Map<string, TransitionHandler<TState, TEvent>>>;
  private stateHandlers: Map<TState, StateHandler<TState>>;
  
  constructor(config: StateMachineConfig<TState, TEvent>) {
    this.currentState = config.initialState;
    this.transitions = this.buildTransitions(config.states);
    this.stateHandlers = this.buildHandlers(config.states);
  }
  
  transition(event: TEvent): TState {
    const eventType = (event as any).type;
    const transitionMap = this.transitions.get(this.currentState);
    const handler = transitionMap?.get(eventType);
    
    if (handler) {
      const nextState = handler(event, this.currentState);
      if (nextState !== this.currentState) {
        this.exitState(this.currentState);
        this.currentState = nextState;
        this.enterState(this.currentState);
      }
      return this.currentState;
    }
    
    return this.currentState;
  }
}
```

### パフォーマンス考慮事項

1. **イベントデバウンス**
   - PointerMoveイベントのスロットリング
   - RequestAnimationFrameの活用

2. **メモリ管理**
   - 不要な状態データのクリーンアップ
   - WeakMapを使用した参照管理

3. **レンダリング最適化**
   - Virtual DOM的なdiff処理
   - バッチ更新

## テスト戦略

### 単体テスト

```typescript
// packages/drawing-tools/src/__tests__/state-machine.test.ts
describe('StateMachine', () => {
  it('should handle state transitions', () => {
    // テスト実装
  });
});
```

### 統合テスト

```typescript
// apps/e2e/tests/tools/drawing-tools.spec.ts
test('Rectangle tool should create shapes with constraints', async ({ page }) => {
  // E2Eテスト実装
});
```

## マイグレーション戦略

### 後方互換性の維持

```typescript
// 既存のAPIを維持しながら新しい実装に切り替え
class ToolManager {
  // 既存のメソッドを維持
  registerTool(tool: Tool | StatefulTool): void {
    if (tool instanceof StatefulTool) {
      // 新しい実装
    } else {
      // レガシー実装
    }
  }
}
```

### 段階的な移行

1. 新しいToolは全てStatefulToolで実装
2. 既存Toolは順次移行
3. 移行完了後、レガシーコードを削除

## スケジュール

| フェーズ | 期間 | 開始予定 | 完了予定 |
|---------|------|----------|----------|
| Phase 1 | 2週間 | Week 1 | Week 2 |
| Phase 2 | 1週間 | Week 3 | Week 3 |
| Phase 3 | 1週間 | Week 4 | Week 4 |
| Phase 4 | 2週間 | Week 5 | Week 6 |
| Phase 5 | 1週間 | Week 7 | Week 7 |

## リスクと対策

### リスク1: パフォーマンス劣化
**対策**: 
- ベンチマークテストの実装
- プロファイリングツールの活用

### リスク2: 既存機能の破壊
**対策**:
- 包括的なE2Eテスト
- 段階的なリリース

### リスク3: 学習コストの増加
**対策**:
- 詳細なドキュメント作成
- サンプルコードの充実

## 成功基準

1. **開発効率**: 新しいTool追加が現在の50%の時間で可能
2. **コード品質**: 重複コードの80%削減
3. **拡張性**: サードパーティToolのサポート
4. **パフォーマンス**: 現行と同等以上の処理速度

## まとめ

この実装計画により、uSketchは以下を実現します：

- ✅ 統一されたToolアーキテクチャ
- ✅ 高い拡張性と保守性
- ✅ 豊富なTool機能
- ✅ 優れた開発体験

次のステップは、Phase 1の基盤実装から開始します。