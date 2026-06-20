import { useToastStore, type ToastVariant } from '@/stores/toast-store';

function push(message: string, variant: ToastVariant) {
  useToastStore.getState().push(message, variant);
}

export const toast = {
  success: (message: string) => push(message, 'success'),
  error: (message: string) => push(message, 'error'),
  info: (message: string) => push(message, 'info'),
};
