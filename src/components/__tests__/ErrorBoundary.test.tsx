import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';

describe('ErrorBoundary', () => {
  it('should render children if no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );
    expect(getByText('All good')).toBeTruthy();
  });

  it('should render fallback if error occurs', () => {
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
    
    expect(getByText(/应用发生意外错误|Application Unexpected Error/)).toBeTruthy();
    expect(getByText(/刷新页面重试|Refresh and Retry/)).toBeTruthy();
    
    consoleSpy.mockRestore();
  });
});
