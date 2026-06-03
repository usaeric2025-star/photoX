import { useEffect } from 'react';
import AnyTouch from 'any-touch';

interface UseLongPressOptions {
  /** 长按触发延迟（毫秒），默认 600ms */
  delay?: number;
  /** 触发后的回调函数 */
  onLongPress: (event?: any) => void;
}

/**
 * 封装 any-touch，从物理底层解决虚拟滚动和长按冲突
 */
export function useLongPress(
  ref: React.RefObject<HTMLElement | null>,
  { onLongPress, delay = 600 }: UseLongPressOptions
) {
  useEffect(() => {
    if (!ref.current) return;

    // 初始化手势识别器
    const at = new AnyTouch(ref.current, {
      preventDefault: false, // 允许滚动事件正常触发（AnyTouch 会智能介入）
    });

    // 这里注意 any-touch 默认是有 press 事件的
    // 可以通过 at.get('press').set(options) 来配置
    at.get('press')?.set({ time: delay });

    // 监听长按事件
    const handlePress = (e: any) => {
      // 阻止默认菜单（如果有）
      if (e && e.nativeEvent) {
          e.nativeEvent.preventDefault?.();
      }
      onLongPress(e);
    };

    at.on('press', handlePress);

    // 组件卸载时清理
    return () => {
      at.destroy();
    };
  }, [ref, onLongPress, delay]);
}
