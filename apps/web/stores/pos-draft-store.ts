'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PosDraftState {
  customerName: string;
  customerPhone: string;
  weight: string;
  serviceId: string;
  paymentMethod: string;
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
      }),
    }
  )
);
