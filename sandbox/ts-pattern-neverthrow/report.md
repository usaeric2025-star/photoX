# ts-pattern + neverthrow 聯合評估報告 [v2.6]

## 1. [COMBO-DRAG-DELTA]
- **結論**: 明著提升。
- **分析**: 相比原生 `switch` 或 `if/else`，`ts-pattern` 的 `.exhaustive()` 提供了編譯時期的安全性。結合 `neverthrow` 的 `Result` 類型，使得錯誤處理不再是可選的（Optional），而是強制的。這對於處理拖曳分組中可能出現的多種中間狀態（如：移動中、等待接口、樂觀失敗）至關重要。

## 2. [DUAL-DEFENSE-GAIN]
- **權重**: 高。
- **AI 維護優勢**: 
  - AI 在生成代碼時，常會忘記處理 `null` 或異常。`neverthrow` 強制檢查 `isOk()` 才能讀取值。
  - 當新增狀態（例如：多選拖曳）時，`ts-pattern` 會立即報錯，直到 AI 補全該分支。

## 3. [CONTRACT-COMPAT]
- **狀態**: 通過。
- `Result<T, E>` 的結構與 `@mutation-contract` 定義的不變量完美契合。可以將 `onMutate` 的結果封裝為 `Result` 進行傳遞。

## 4. [決策]
- **ADOPT_BOTH** (試點先行): 
  - 立即在 `useDragGrouping.ts` 中採用這套組合。
  - 在 `AGENTS.md` 中追加雙庫條款，作為 P3-A 的核心編碼基準。
