# Contract Health Baseline (v2.20.1)

## 📊 Core Metrics
- **schemaComplexity**: 142  
  *Analysis: Cumulative field count across Photo (32), Group (24), Storage (46), and AI (40) schemas. 30-day trend: +15% due to v2.17 R2 Audit expansion.*
- **probeFalsePositiveRate**: 0.02 (2.0%)  
  *Analysis: Observed during v2.19 Traffic Replay probe deployment. All GET requests pass, but certain query parameter edge cases triggered transient failures.*
- **adapterStaleness**: 0.15 (15%)  
  *Analysis: Remaining Base UI components using legacy asChild patterns. v2.20.1 migration covered 85% of high-traffic paths.*

## ⚠️ Budget Alerts
- **schemaComplexity**: [YELLOW] Approaches 150 threshold. Need for schema pruning or decomposition.
- **adapterStaleness**: [RED] Above 10% target for v2.20 cycle. v2.20.1 Hotfix was necessary to prevent P0 UI failures.
- **probeFalsePositiveRate**: [GREEN] Well within 5% budget.

## 📋 Indicators
- **V2.19 Traffic Replay**: Active (1% sampling)
- **V2.17 R2 Audit**: Active (Daily snapshot)
- **V2.14 Slot Contract**: Enforced (Linter level)
