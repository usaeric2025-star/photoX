import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminDiagnostics from '../../AdminDiagnostics';
import * as useAuthHook from '@/hooks/core/auth/useAuth';

vi.mock('@/hooks/core/auth/useAuth', () => ({
  useAuth: vi.fn()
}));

describe('AdminDiagnostics Security Locks', () => {
  it('should render null if not admin', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { role: 'user', email: 'test@example.com' } as any,
      isLoading: false,
      isPending: false,
      isAuthenticated: true,
      refetch: vi.fn() as any,
      loginWithGoogle: vi.fn(),
      logout: vi.fn()
    });

    const { container } = render(<AdminDiagnostics />);
    expect(container.firstChild).toBeNull();
  });

  it('should render trigger button if is admin', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { role: 'admin', email: 'admin@example.com' } as any,
      isLoading: false,
      isPending: false,
      isAuthenticated: true,
      refetch: vi.fn() as any,
      loginWithGoogle: vi.fn(),
      logout: vi.fn()
    });

    render(<AdminDiagnostics />);
    expect(screen.getByText('DIAGNOSTICS')).toBeDefined();
  });
});
