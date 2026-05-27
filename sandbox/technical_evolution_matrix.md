# P3 技術演進決策矩陣 (v2.6)

| 技術項 | 決策 | [TRIGGER-SIGNAL] | [BLOCKER] | 遷移工時 |
| :--- | :--- | :--- | :--- | :--- |
| **Zustand v5** | ADOPT | stable 版發布 | R19 升級前置完成 | ~4h |
| **React Compiler** | COEXIST | R19 升級成功 | 核心組件邊界劃分完成 | ~8h |
| **TanStack Router** | WAIT | v2.6 生產穩定 ≥ 4w | 項目排期允許大規模重構 | ~16h |
| **Vite 6** | ADOPT | v2.6 基礎設施審核完畢 | CI/CD 環境更新支持 | ~2h |

## 詳細報告

### 1. [V5-COMPAT-REPORT]
- Zustand v5 RC 在 sandbox 測試中表現優異，`shallow` 提取為獨立包後，`useShallow` 在 React 18 下仍能穩定工作。
- 遷移成本主要在於從 `zustand` 核心包切換到 `zustand/react/shallow`。

### 2. [COMPILER-STRATEGY-REPORT]
- 決策為 `COEXIST`。React Compiler 能有效減少手動記憶化，但對於已有 `@deps-contract` 的關鍵 Hook，應保留手動控制以保持 AI 代碼生成的確定性。

### 3. [TANSTACK-ROUTER-MIGRATION-COST]
- 評分為 **中 (Medium)**。雖然獲益巨大（路由參數類型安全），但需要重寫整個 `App.tsx` 的路由分發邏輯，並調整所有導航跳轉。

### 4. [VITE6-BUILD-COMPAT]
- 通過。Vite 6 對於現有配置幾乎是無縫升級，建議在穩定運行後儘快執行。
