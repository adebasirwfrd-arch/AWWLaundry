'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SplitPaymentMethod, RemainingTiming } from '@aww/shared';

interface PosDraftState {
  customerName: string;
  customerPhone: string;
  weight: string;
  serviceId: string;
  paymentMethod: string;
  dpMethod: SplitPaymentMethod;
  dpAmount: string;
  remainingMethod: SplitPaymentMethod;
  remainingTiming: RemainingTiming;
  setField: <K extends keyof Omit<PosDraftState, 'setField' | 'clearDraft'>>(
    key: K,
    value: PosDraftState[K]
  ) => void;
  clearDraft: () => void;
}

const empty = {
  customerName: '',
  customerPhone: '',
  weight: '',
  serviceId: '',
  paymentMethod: 'CASH',
  dpMethod: 'CASH' as SplitPaymentMethod,
  dpAmount: '',
  remainingMethod: 'QRIS' as SplitPaymentMethod,
  remainingTiming: 'LATER' as RemainingTiming,
};

export const usePosDraftStore = create<PosDraftState>()(
  persist(
    (set) => ({
      ...empty,
      setField: (key, value) => set({ [key]: value }),
      clearDraft: () => set(empty),
    }),
    {
      name: 'aww-pos-draft',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        weight: s.weight,
        serviceId: s.serviceId,
        paymentMethod: s.paymentMethod,
        dpMethod: s.dpMethod,
        dpAmount: s.dpAmount,
        remainingMethod: s.remainingMethod,
        remainingTiming: s.remainingTiming,
      }),
    }
  )
);
