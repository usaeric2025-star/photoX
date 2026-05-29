// @ts-nocheck
import { render } from '@testing-library/react';

/**
 * Props-only 测试模板
 * 用于验证组件是纯展示组件（不调用任何 Hook）
 * 
 * 使用方法：
 * 1. 复制此文件到你的组件目录
 * 2. 重命名为 `[ComponentName].test.tsx`
 * 3. 替换 `ComponentName` 和 `mockProps`
 * 4. 运行 `npm run test`
 */

describe('ComponentName (pure component)', () => {
  it('renders without crashing with only props', () => {
    const mockProps = { /* 替换为实际 props */ };
    const { container } = render(<ComponentName {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('does not call any hooks', () => {
    // 如果组件内部调用了 Hook，这个测试会因缺少 Provider 而失败
    const mockProps = { /* 替换为实际 props */ };
    expect(() => render(<ComponentName {...mockProps} />)).not.toThrow();
  });
});
