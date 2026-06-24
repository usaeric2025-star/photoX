import { useAppQuery as baseUseAppQuery } from '@/lib/query';
import type { SWRConfiguration, SWRResponse } from 'swr';
import type { BaseSchema, InferOutput, BaseIssue } from 'valibot';

/**
 * 統一 API 查詢 Hook (包含 Schema 驗證)
 */
export function useAppQuery<
  TData,
  TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>
>(
  queryKey: readonly unknown[] | string | null,
  queryFn: (...args: unknown[]) => Promise<TData>,
  options: SWRConfiguration<InferOutput<TSchema>> & { schema: TSchema }
): SWRResponse<InferOutput<TSchema>> & { isPending: boolean };

/**
 * 統一 API 查詢 Hook
 */
export function useAppQuery<TData>(
  queryKey: readonly unknown[] | string | null,
  queryFn: (...args: unknown[]) => Promise<TData>,
  options?: SWRConfiguration<TData>
): SWRResponse<TData> & { isPending: boolean };

export function useAppQuery<
  TData,
  TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>> = BaseSchema<unknown, unknown, BaseIssue<unknown>>
>(
  queryKey: readonly unknown[] | string | null,
  queryFn: (...args: unknown[]) => Promise<TData>,
  options?: SWRConfiguration<TData | InferOutput<TSchema>> & { schema?: TSchema }
) {
  return baseUseAppQuery(queryKey, queryFn, options);
}
