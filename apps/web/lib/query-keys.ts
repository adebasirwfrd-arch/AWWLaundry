export const queryKeys = {
  notifications: ['notifications'] as const,
  chat: {
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  },
  worker: {
    orders: ['worker', 'orders'] as const,
  },
  cashier: {
    pendingOrders: ['cashier', 'pending-orders'] as const,
  },
};
