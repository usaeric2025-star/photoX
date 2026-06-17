import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

/**
 * mutationTester - A utility to verify optimistic updates and rollbacks.
 */
export const mutationTester = {
    async testRollback<TData, TVars>(
        useMutationHook: () => any,
        triggerVars: TVars,
        mockService: (vars: TVars) => Promise<TData>,
        targetQueryKey: readonly unknown[],
        initialData: any
    ) {
        const queryClient = new QueryClient();
        queryClient.setQueryData(targetQueryKey, initialData);

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useMutationHook(), { wrapper });

        // Simulate failure
        const error = new Error('Simulated Mutation Failure');
        vi.spyOn(console, 'error').mockImplementation(() => {});

        let mutationPromise: Promise<any>;
        await act(async () => {
            mutationPromise = result.current.mutateAsync(triggerVars);
        });

        // Check optimistic state
        const optimisticData = queryClient.getQueryData(targetQueryKey);
        
        try {
            await mutationPromise!;
        } catch (e) {
            // Expected
        }

        // Check rollback
        const finalData = queryClient.getQueryData(targetQueryKey);
        
        return {
            optimisticData,
            finalData,
            isRolledBack: JSON.stringify(finalData) === JSON.stringify(initialData)
        };
    }
};
