# 契約演進治理規範 (Contract Governance) v1.0 - Calibrated

## 🛡️ 治理目標
確保 PhotoX 契約化系統在長期演進中保持低熵值與高可維護性，防止「契約碎片化」或「技術債積壓」。

## 🚦 健康度閾值 (Budget Thresholds)

| 指標 | 單位 | 預算 (Budget) | 警告值 (Warning) | 當前狀態 (v2.20.1) |
| :--- | :--- | :--- | :--- | :--- |
| **schemaComplexity** | Fields | < 150 | 120 | 142 [YELLOW] |
| **probeFalsePositiveRate** | % | < 5% | 3% | 2% [GREEN] |
| **adapterStaleness** | % | < 10% | 5% | 15% [RED] |

## 📅 校準說明 (Calibration Notes)
- **[schemaComplexity]**: 當前值 142 接近 150 上限。
  - **決策**: v2.21 起強制執行 Schema 拆分，單個 Validator 字段不得超過 40。
  - **狀態**: 標記為「高風險關注」。
- **[adapterStaleness]**: 當前值 15% 已穿透預算。
  - **原因**: Base UI `asChild` 遷移尚未覆蓋所有低頻頁面。
  - **決策**: v2.20.1 標記為「歷史債待清理」，並於首個 Sprint 優先完成 100% 覆蓋。
- **[probeFalsePositiveRate]**: 當前 2% 表現良好。
  - **決策**: 維持現有檢測力度，收緊警告值至 2% 以提前發現不穩定請求。

## 📜 治理剛性契約
1. **觸發告警時禁止合並**: 任何 PR 若導致指標進入 [RED] 區間，必須包含對應指標的修復補丁。
2. **季末強制收繳**: 每季末必須縮減 20% 預算，推動架構精簡。
3. **AI 參與治理**: 探針發現指標異常時，自動生成 Anti-pattern 提議。
