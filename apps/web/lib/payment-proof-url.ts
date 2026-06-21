import type { CustomerOrderPaymentInput } from '@aww/shared';
import { resolveStorageUrl } from '@/lib/object-storage';
import { parseCustomerPaymentFromNotes } from '@/lib/payment-plan';

function isBrokenProofUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  return url.startsWith('blob:') || url.startsWith('data:');
}

function fallbackProofFromCustomerPayment(
  customerPayment: CustomerOrderPaymentInput | null | undefined,
  paymentIndex: number,
  method: string
): string | null | undefined {
  if (!customerPayment) return null;

  if (customerPayment.mode === 'QRIS' || customerPayment.mode === 'BANK_TRANSFER') {
    return customerPayment.proofUrl;
  }

  if (customerPayment.mode === 'COMBINATION' && customerPayment.combination) {
    const cp = customerPayment.combination;
    if (paymentIndex === 0 || method === cp.dpMethod) return cp.dpProofUrl;
    if (paymentIndex === 1 || method === cp.remainingMethod) return cp.remainingProofUrl;
  }

  return null;
}

export async function resolvePaymentProofUrl(
  storedUrl: string | null | undefined,
  fallbackUrl?: string | null
): Promise<string | null> {
  const raw = !isBrokenProofUrl(storedUrl) ? storedUrl : fallbackUrl;
  if (!raw || isBrokenProofUrl(raw)) return null;
  return resolveStorageUrl(raw);
}

export async function resolveOrderPaymentProofs<
  T extends { method: string; amount: number; proofUrl?: string | null },
>(payments: T[], notes?: string | null): Promise<(T & { proofUrl: string | null })[]> {
  const customerPayment = parseCustomerPaymentFromNotes(notes);

  return Promise.all(
    payments.map(async (payment, index) => ({
      ...payment,
      proofUrl: await resolvePaymentProofUrl(
        payment.proofUrl,
        fallbackProofFromCustomerPayment(customerPayment, index, payment.method)
      ),
    }))
  );
}

export async function resolveCustomerPaymentProofs(
  customerPayment: CustomerOrderPaymentInput | null | undefined
): Promise<CustomerOrderPaymentInput | null | undefined> {
  if (!customerPayment) return customerPayment;

  if (customerPayment.proofUrl) {
    return {
      ...customerPayment,
      proofUrl: (await resolvePaymentProofUrl(customerPayment.proofUrl)) ?? undefined,
    };
  }

  if (customerPayment.mode === 'COMBINATION' && customerPayment.combination) {
    const cp = customerPayment.combination;
    return {
      ...customerPayment,
      combination: {
        ...cp,
        dpProofUrl: (await resolvePaymentProofUrl(cp.dpProofUrl)) ?? undefined,
        remainingProofUrl: (await resolvePaymentProofUrl(cp.remainingProofUrl)) ?? undefined,
      },
    };
  }

  return customerPayment;
}
