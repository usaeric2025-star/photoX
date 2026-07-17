import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginScreen } from '#src/components/admin/LoginScreen.js';
import React from 'react';

// Mock ui store
vi.mock('#lib/store/index.js', () => ({
  useUI: (cb: (state: { appLang: string }) => unknown) => cb({ appLang: 'en' }),
  useAuth: (cb: (state: { user: any; signOut: any; isLoading: boolean }) => unknown) => cb({ user: null, signOut: vi.fn(), isLoading: false }),
}));

// Mock hooks
vi.mock('#src/hooks/index.js', () => {
  const mockTranslations = {
    loginTitleAdmin: 'Admin',
    loginTitleStaff: 'Staff',
    login: 'Login',
    enterPasscode: 'Enter Passcode',
    unlockAndAccess: 'Unlock',
    invalidCode: 'Invalid code',
    loginFailed: 'Login failed',
    agreeByConnecting: 'By connecting, you agree to our',
    termsOfService: 'Terms',
    privacyPolicy: 'Privacy',
    backToShowcase: 'Back to Showcase'
  };
  return {
    usePublicSettings: () => ({
      data: {
        accessPasscode: '123456'
      }
    }),
    useTranslation: () => ({
      t: (key: string) => (mockTranslations as any)[key] || key,
      appLang: 'en',
      lang: 'en',
      uiTranslations: mockTranslations
    }),
    useUI: (cb: (state: { appLang: string }) => unknown) => cb({ appLang: 'en' }),
  };
});

// Mock wouter
vi.mock('wouter', () => ({
  Link: ({ children }: any) => <a>{children}</a>,
  useLocation: () => ['/', vi.fn()],
}));

describe('LoginScreen', () => {
  it('renders correctly and allows mode switching', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    render(<LoginScreen signIn={signIn} />);
    
    // Check initial state (admin mode)
    expect(screen.getByText('Photo')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();

    // Switch to staff mode
    const staffBtn = screen.getByText('Staff');
    await act(async () => {
      fireEvent.click(staffBtn);
    });

    // Check staff mode elements
    expect(screen.getByPlaceholderText('Enter Passcode')).toBeTruthy();
    expect(screen.getByText('Unlock')).toBeTruthy();
  });

  it('calls signIn when login button is clicked in admin mode', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    render(<LoginScreen signIn={signIn} />);
    
    const loginBtn = screen.getByText('Login');
    await act(async () => {
      fireEvent.click(loginBtn);
    });

    expect(signIn).toHaveBeenCalled();
  });
});
