'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DashboardPeriod } from '@/lib/date-buckets';

type MainTab = 'income' | 'expense';
type ExpenseTab = 'CAPEX' | 'OPEX';

interface CashflowFiltersState {
  mainTab: MainTab;
  expenseTab: ExpenseTab;
  period: DashboardPeriod;
  branchId: string;
  setMainTab: (tab: MainTab) => void;
  setExpenseTab: (tab: ExpenseTab) => void;
  setPeriod: (period: DashboardPeriod) => void;
  setBranchId: (branchId: string) => void;
}

export const useCashflowFiltersStore = create<CashflowFiltersState>()(
  persist(
    (set) => ({
      mainTab: 'income',
      expenseTab: 'CAPEX',
      period: 'month',
      branchId: '',
      setMainTab: (mainTab) => set({ mainTab }),
      setExpenseTab: (expenseTab) => set({ expenseTab }),
      setPeriod: (period) => set({ period }),
      setBranchId: (branchId) => set({ branchId }),
    }),
    {
      name: 'aww-cashflow-filters',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
