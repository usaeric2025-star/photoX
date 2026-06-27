import useSWR, { SWRConfiguration } from 'swr';
import * as v from 'valibot';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

/**
 * Standard Query Factory for PhotoX using SWR with mandatory Valibot Schema.
 */
export function createQuery<TData, TVariables = void, TSchema extends v.GenericSchema = v.GenericSchema>(config: {
  queryKey: (variables: TVariables) => readonly unknown[];
  queryFn: (variables: TVariables, signal?: AbortSignal) => Promise<TData>;
  staleTime?: number;
  schema: TSchema;
  variablesSchema?: v.BaseSchema<unknown, TVariables, v.BaseIssue<unknown>>;
}) {
  return function useStandardQuery(variables: TVariables, options?: SWRConfiguration<TData>) {
    const key = config.queryKey(variables);

    // Run-time query variables validation if variablesSchema is provided
    if (config.variablesSchema && variables !== undefined) {
      const validation = v.safeParse(config.variablesSchema, variables);
      if (!validation.success) {
        throw ErrorFactory.wrap(new Error('Query Variables Validation Failed'), 'Query Variables Validation');
      }
    }

    const swr = useSWR<TData, Error>(
      JSON.stringify(key),
      async ({ signal }) => {
        try {
          const data = await config.queryFn(variables, signal as AbortSignal);
          const validation = v.safeParse(config.schema, data);
          if (!validation.success) {
            throw new Error(`Data Validation Failed: ${JSON.stringify(validation.issues)}`);
          }
          return validation.output as TData;
        } catch (e) {
          throw ErrorFactory.wrap(e, 'Query Execution');
        }
      },
      {
        dedupingInterval: config.staleTime ?? 5 * 60 * 1000,
        ...options,
      }
    );

    return swr;
  };
}
