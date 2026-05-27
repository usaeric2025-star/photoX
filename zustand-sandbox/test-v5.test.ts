import { describe, it, expect } from 'vitest';
import { useSandboxStore } from './store';
import { shallow } from 'zustand/shallow';

describe('Zustand v5 Compatibility Sandbox', () => {
  it('should initialize state correctly with v5', () => {
    const state = useSandboxStore.getState();
    expect(state.searchQuery).toBe('');
    expect(state.appLang).toBe('en');
  });

  it('should update state correctly', () => {
    useSandboxStore.getState().setSearchQuery('test');
    expect(useSandboxStore.getState().searchQuery).toBe('test');
  });

  it('should support shallow selector equality', () => {
    const selector = (s: any) => ({ 
        lang: s.appLang,
        query: s.searchQuery 
    });
    
    // In v5, `shallow` is the equality function
    const state = useSandboxStore.getState();
    const resA = selector(state);
    
    useSandboxStore.getState().setAppLang('zh');
    const stateB = useSandboxStore.getState();
    const resB = selector(stateB);
    
    // The equality check should fail if the new object is different
    const isEqual = shallow(resA, resB);
    expect(isEqual).toBe(false);
  });
});
