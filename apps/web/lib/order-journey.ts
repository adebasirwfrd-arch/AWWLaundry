export const COMPLETED_ORDER_STATUSES = ['READY', 'PICKED_UP', 'DELIVERED'] as const;

export function isOrderCompleted(status: string): boolean {
  return (COMPLETED_ORDER_STATUSES as readonly string[]).includes(status);
}

export const ORDER_JOURNEY = [
  { status: 'RECEIVED', label: 'Diterima', desc: 'Cucian Anda sudah kami terima & timbang' },
  { status: 'WASHING', label: 'Mencuci', desc: 'Sedang dicuci bersih dengan deterjen premium' },
  { status: 'DRYING', label: 'Mengering', desc: 'Proses pengeringan sempurna' },
  { status: 'IRONING', label: 'Menyetrika', desc: 'Disetrika rapi & wangi' },
  { status: 'FOLDING', label: 'Melipat', desc: 'Dilipat rapi siap dikemas' },
  { status: 'READY', label: 'Siap Diambil', desc: 'Cucian Anda sudah siap! 🎉' },
] as const;

export const JOURNEY_COLORS: Record<string, string> = {
  RECEIVED: '#4ECDC4',
  WASHING: '#4A90D9',
  DRYING: '#9B59B6',
  IRONING: '#FF8C2A',
  FOLDING: '#FFD23F',
  READY: '#6BCB77',
};

export const JOURNEY_ICONS = {
  RECEIVED: 'Package',
  WASHING: 'Shirt',
  DRYING: 'Wind',
  IRONING: 'Flame',
  FOLDING: 'Layers',
  READY: 'CheckCircle2',
} as const;
