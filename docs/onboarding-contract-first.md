# 契約化開發 5 分鐘入門 (Contract-First Quick Onboarding)

歡迎加入 PhotoX 研發小組！
本專案已全面進化為「AI 共生、契約優先（Contract-First）」的架構。為防止 AI 幻覺，所有程式碼的設計與演進皆以契約、Schema 與自動化 Diagnostics 為核心。

本篇 Onboarding 指南將幫助你在 5 分鐘內掌握最核心的開發哲學與工程安全防線。

---

## 🧭 1. 認知同步：精確術語對照表

在 PhotoX，我們不使用籠統模糊的前端描述詞彙。請在所有討論、JSDoc、代碼註釋和 PR 描述中嚴格遵守以下對照：

| 🔴 進制使用（模糊/過時詞彙） | ✅ 必須使用（精確契約化語意） |
| :--- | :--- |
| **權限檢查** | **路由 beforeLoad 契約聲明** |
| **狀態管理** | **URL Params / Query Key 契約流動** |
| **錯誤處理** | **Schema aiDebugHint 結構化診斷** |
| **Hook 邏輯** | **契約執行器管道接口** |

---

## 🛠️ 2. 契約化開發三部曲

### 第一步：定義 Data Schema 契約
在進入任何業務實作前，必須先在 `src/shared/apiContractSchema.ts` 或對應的 Validator 中，使用 **ArkType** 或其他強類型驗證器定義實體契約：
```ts
// 例：定義一項 Hono RPC API 輸入契約
export const UploadPresignReqSchema = type({
  photoId: 'string',
  'contentType?': 'string',
});
```

### 第二步：添加自動化 Diagnostics 錨點
新契約定義後，禁止直接寫業務邏輯。必須立刻在 `src/pages/AdminView/diagnostics/` 下為該契約編寫一個自動化 Audit 檢查器。
例如，在 `apiContracts.test.ts` 中註冊驗證錨點：
```ts
it('Anchor: Upload Presign Input Contract', () => {
  const payload = { photoId: '9b1deb4d...6d', contentType: 'image/jpeg' };
  const check = UploadPresignReqSchema(payload);
  expect(check instanceof type.errors).toBe(false);
});
```
我們目前擁有 **80+ 項前端與 API 契約驗證錨點**，全面防禦任何類型退化。

### 第三步：數據管道歸一化 & 預取
數據綁定必須嚴格遵循新鮮度契約（Freshness Policy）。
1. 透過 `src/lib/queryKeys.ts` 工廠生成唯一 Key。
2. 路由切換時，必須於 `src/router.tsx` 中配置 `loader` 函數，提前預取數據，實現流暢的無縫導航：
```ts
loader: async ({ params: { groupId }, context }) => {
  const { queryClient } = context;
  if (!queryClient || !groupId) return;
  const queryKey = groupKeys.detail(groupId, 'STABLE');
  queryClient.prefetchQuery({
    queryKey,
    queryFn: () => getGroupById(groupId),
    staleTime: createStaleTime('STABLE'),
  });
}
```

---

## 🚨 3. 雷區與紅線

- ❌ **嚴禁使用 Regex/sed 批量替換**：所有全局代碼轉譯必須使用 AST（如 `ts-morph`）並在 sandbox 驗證。
- ❌ **嚴禁單字母變量**：除了變量 `i` 和泛型 `<T>` 外，任何 `t`、`p`、`e` 等單字母語語意變量均不可存留。
- ❌ **不要繞過 Service**：寫入/刪除操作必須經由 `photoMutationService` 與 `groupMutationService`。

遵從這套安全密碼，你將能產出完美且具備極高免疫力的系統實作。
祝開發愉快！

---

[ONBOARDING-MATERIAL-READY]
