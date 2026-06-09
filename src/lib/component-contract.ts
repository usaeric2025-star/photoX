import React from 'react';
import { type } from 'arktype';

/**
 * [V2.9-COMPONENT-CONTRACT] Component Prop Boundary
 */
export const SlotContractSchema = type({
  "requiredSlots": "string[]",
  "optionalSlots?": "string[]",
});

export type SlotContract = typeof SlotContractSchema.infer;

/**
 * Helper to ensure a component satisfies a contract
 */
export function defineComponentContract<P>(contract: SlotContract) {
  return (props: P) => {
    // Development-time contract enforcement could be added here
    return props;
  };
}

/**
 * Explicit Slot pattern for better AI guidance
 */
export interface LayoutContract {
  slots: {
    header?: React.ReactNode;
    content: React.ReactNode;
    footer?: React.ReactNode;
    sidebar?: React.ReactNode;
  }
}

/**
 * [V2.14-SLOT-CONTRACT] Headless Slot Contract
 */
export interface HeadlessSlot<T> {
  component: React.ComponentType<T>;
  props: T;
  key?: string;
  name: string;
}
