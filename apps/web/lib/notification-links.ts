import { Role } from '@aww/shared';
import { buildOpnameResumeUrl, type OpnameResumeStep } from '@/lib/opname-utils';

export interface NotificationData {
  orderId?: string;
  orderNumber?: string;
  opnameId?: string;
  branchId?: string;
  step?: OpnameResumeStep;
  resumeUrl?: string;
  machineLogId?: string;
  machineId?: string;
  conversationId?: string;
}

function parseNotificationData(data: string): NotificationData {
  try {
    return JSON.parse(data) as NotificationData;
  } catch {
    return {};
  }
}

function usesOwnerInventory(role: Role): boolean {
  return role === Role.OWNER || role === Role.SUPER_ADMIN || role === Role.MANAGER;
}

function inventoryPath(role: Role, params?: URLSearchParams): string {
  const base = usesOwnerInventory(role) ? '/owner/inventory' : '/cashier/inventory';
  if (!params || [...params].length === 0) return base;
  return `${base}?${params.toString()}`;
}

function inboxLink(opts?: { hash?: string; query?: Record<string, string> }): string {
  const params = new URLSearchParams(opts?.query);
  const qs = params.toString();
  let path = '/cashier/inbox';
  if (qs) path += `?${qs}`;
  if (opts?.hash) path += `#${opts.hash}`;
  return path;
}

export function getNotificationLink(type: string, data: string, role: Role): string {
  const parsed = parseNotificationData(data);

  if (type === 'STOCK_OPNAME_DRAFT') {
    if (parsed.resumeUrl) return parsed.resumeUrl;
    if (parsed.branchId && parsed.step) {
      return buildOpnameResumeUrl(role, parsed.branchId, parsed.step);
    }
    return inboxLink({ hash: 'opname-draft' });
  }

  if (type === 'STOCK_OPNAME_PENDING') {
    if (parsed.opnameId) {
      return inboxLink({ hash: 'opname', query: { opname: parsed.opnameId } });
    }
    return inboxLink({ hash: 'opname' });
  }

  if (type === 'STOCK_OPNAME_REVISION') {
    const params = new URLSearchParams({ tab: 'opname' });
    if (usesOwnerInventory(role) && parsed.branchId) params.set('branch', parsed.branchId);
    return inventoryPath(role, params);
  }

  if (type === 'STOCK_OPNAME_APPROVED' || type === 'STOCK_OPNAME_REJECTED') {
    const params = new URLSearchParams({ tab: 'history' });
    if (usesOwnerInventory(role) && parsed.branchId) params.set('branch', parsed.branchId);
    return inventoryPath(role, params);
  }

  if (type === 'ORDER_RECEIVED') {
    if (role === Role.WORKER) return '/worker';
    if (parsed.orderId) return `/orders/${parsed.orderId}`;
    return role === Role.CASHIER ? '/cashier/orders' : '/owner/orders';
  }

  if (type === 'ORDER_CONFIRMATION') {
    return inboxLink();
  }

  if (type === 'ORDER_REVIEW') {
    return inboxLink({ hash: 'ulasan' });
  }

  if (type === 'MACHINE_TROUBLE') {
    return inboxLink({ hash: 'mesin' });
  }

  if (type === 'MACHINE_TROUBLE_REPLY') {
    return inboxLink({ hash: 'laporan-mesin' });
  }

  if (type === 'CHAT_CUSTOMER') {
    if (role === Role.WORKER) return inboxLink();
    if (parsed.conversationId) return `/messages?conversation=${parsed.conversationId}`;
    return '/messages';
  }

  if (type === 'CHAT_STAFF') {
    if (parsed.conversationId) return `/discussion?conversation=${parsed.conversationId}`;
    return '/discussion';
  }

  return '';
}

export type NotificationIconKind = 'order' | 'review' | 'message' | 'machine' | 'opname' | 'default';

export function getNotificationIconKind(type: string): NotificationIconKind {
  if (type.startsWith('STOCK_OPNAME')) return 'opname';
  if (type.startsWith('MACHINE')) return 'machine';
  if (type === 'ORDER_REVIEW') return 'review';
  if (type.startsWith('ORDER')) return 'order';
  if (type.startsWith('CHAT')) return 'message';
  return 'default';
}
