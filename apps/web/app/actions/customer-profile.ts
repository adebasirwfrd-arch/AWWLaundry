'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { storeUploadedFile } from '@/lib/object-storage';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function uploadCustomerAvatar(formData: FormData) {
  const session = await requireAuth([Role.CUSTOMER]);
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('Foto tidak ditemukan');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Format foto harus JPG, PNG, atau WebP');
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Ukuran foto maksimal 2MB');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg';
  const fileName = `${session.user.id}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const avatarUrl = await storeUploadedFile({
    folder: 'avatars',
    fileName,
    bytes,
    mime: file.type,
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  });

  revalidatePath('/customer', 'layout');
  revalidatePath('/customer/profile');

  return { avatarUrl };
}

export async function updateCustomerProfile(input: {
  name: string;
  phone: string;
  address?: string;
  avatarUrl?: string | null;
}) {
  const session = await requireAuth([Role.CUSTOMER]);
  const name = input.name.trim();
  const phone = normalizePhone(input.phone.trim());
  const address = input.address?.trim() || null;

  if (name.length < 2) throw new Error('Nama minimal 2 karakter');
  if (phone.length < 10 || phone.length > 15) throw new Error('Nomor telepon tidak valid');

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) throw new Error('Profil pelanggan tidak ditemukan');

  const phoneTaken = await prisma.customer.findFirst({
    where: {
      organizationId: customer.organizationId,
      phone,
      NOT: { id: customer.id },
    },
  });
  if (phoneTaken) throw new Error('Nomor telepon sudah digunakan pelanggan lain');

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone,
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
    }),
    prisma.customer.update({
      where: { id: customer.id },
      data: {
        name,
        phone,
        address,
      },
    }),
  ]);

  revalidatePath('/customer', 'layout');
  revalidatePath('/customer/profile');
  revalidatePath('/customer/history');

  return { ok: true };
}

export async function removeCustomerAvatar() {
  const session = await requireAuth([Role.CUSTOMER]);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
  });

  revalidatePath('/customer', 'layout');
  revalidatePath('/customer/profile');

  return { ok: true };
}
