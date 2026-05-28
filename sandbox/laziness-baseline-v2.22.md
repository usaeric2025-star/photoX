# Laziness Baseline Report (v2.22)

## 📊 Summary of Technical Debt
- **any/unknown types**: 12 locations found (primarily in legacy adapters and older validators).
- **Weak semantic variables**:
  - `data`: 45 instances (mostly used for query results).
  - `item`: 22 instances (mostly in list renderers).
  - `error`: 18 instances (catch blocks).
- **Design Tokens**: 95% compliance. 5 instances of `w-[...]` found in experimental UI components.

## 📋 Remediation Plan
1. **P1 (v2.22.1)**: Refactor `data` variables in query hooks to `photoData`, `groupData`, etc.
2. **P1 (v2.22.1)**: Assert all catch block `error` variables to `StandardError`.
3. **P2 (v2.23)**: Eliminate all `any` types in `src/lib/validators`.
4. **P3 (v2.23)**: Migrate magic numbers to Tailwind design tokens in `tailwind.config.ts`.
