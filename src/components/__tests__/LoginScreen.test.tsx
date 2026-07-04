import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginScreen } from '#src/components/admin/LoginScreen.js';
import React from 'react';

// Mock useAppRouter
vi.mock('#lib/router', () => ({
  useAppRouter: () => ({
    navigate: {
      home: vi.fn(),
      admin: vi.fn(),
    },
    route: 'home',
    params: {},
    currentUrl: '',
  }),
}));

// Mock locales
vi.mock('#src/locales', () => ({
  translations: {
    en: {
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
    },
    zh: {
      loginTitleAdmin: '管理员',
      loginTitleStaff: '员工',
      login: '登录',
      enterPasscode: '输入访问码',
      unlockAndAccess: '解锁并进入',
      invalidCode: '无效代码',
      loginFailed: '登录失败'
    }
  }
}));

// Mock ui store
vi.mock('#src/store/useUI', () => ({
  useUI: (cb: (state: { appLang: string }) => unknown) => cb({ appLang: 'en' }),
}));

// Mock settings
vi.mock('../../hooks', () => ({
  usePublicSettings: () => ({
    data: {
      access_passcode: '123456'
    }
  })
}));

describe('LoginScreen', () => {
  it('renders correctly and allows mode switching', async () => {
    const signIn = vi.fn();
    render(<LoginScreen signIn={signIn} />);
    
    // Check initial state (admin mode)
    expect(screen.getByText(/Photo/)).toBeTruthy();
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
