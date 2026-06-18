import React from 'react';

/**
 * 解決 VirtualGrid 使用 VList ref 時的型別兼容問題。
 * 依靠 overload 簽名實作從 Ref/RefObject 到 MutableRef 的轉換。
 */
export function toMutableRef<T>(ref: React.Ref<T> | React.RefObject<T | null>): React.Ref<T>;
export function toMutableRef<T>(ref: React.Ref<T>): React.Ref<T>;
export function toMutableRef<T>(ref: React.RefObject<T | null>): React.Ref<T>;
export function toMutableRef<T>(ref: React.Ref<T> | React.RefObject<T | null>): React.Ref<T> {
  return ref;
}
