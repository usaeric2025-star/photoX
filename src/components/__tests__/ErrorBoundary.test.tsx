import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('should render children if no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );
    expect(getByText('All good')).toBeTruthy();
  });

  it('should render fallback if error occurs and not trigger infinite loops', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // Silence console.error for test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(getByText(/应用发生意外错误/)).toBeTruthy();
    expect(getByText(/刷新页面重試|刷新页面重试/)).toBeTruthy();
    
    // Verify componentDidCatch only logs and doesn't trigger side effects
    expect(consoleSpy).toHaveBeenCalled();
    // In our implementation, console error is called multiple times for logging
    
    consoleSpy.mockRestore();
  });
});
