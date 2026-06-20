'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { getAccessibleConversation } from '@/lib/chat';
import { storeUploadedFile } from '@/lib/object-storage';

export async function uploadAttachment(formData: FormData) {
  await requireAuth();
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('File tidak ditemukan');
  if (file.size > 8 * 1024 * 1024) throw new Error('Ukuran file maksimal 8MB');

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const mime = file.type || 'application/octet-stream';

  const url = await storeUploadedFile({ folder: 'chat', fileName, bytes, mime });

  const isImage = mime.startsWith('image/');
  return {
    url,
    type: isImage ? 'image' : 'file',
    name: file.name,
  };
}

/** Customer: get (or lazily create) their support conversation with management. */
export async function getOrCreateCustomerConversation() {
  const session = await requireAuth([Role.CUSTOMER]);
  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) throw new Error('Profil pelanggan tidak ditemukan');

  let convo = await prisma.conversation.findFirst({
    where: { type: 'CUSTOMER_SUPPORT', customerId: customer.id },
  });
  if (!convo) {
    convo = await prisma.conversation.create({
      data: {
        organizationId: session.user.organizationId,
        type: 'CUSTOMER_SUPPORT',
        customerId: customer.id,
        title: customer.name,
      },
    });
  }
  return convo.id;
}

/** Staff: get (or create) the shared staff discussion for the organization. */
export async function getOrCreateStaffDiscussion() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.WORKER]);
  let convo = await prisma.conversation.findFirst({
    where: { type: 'STAFF_DISCUSSION', organizationId: session.user.organizationId },
  });
  if (!convo) {
    convo = await prisma.conversation.create({
      data: {
        organizationId: session.user.organizationId,
        type: 'STAFF_DISCUSSION',
        title: 'Diskusi Tim',
      },
    });
  }
  return convo.id;
}

export async function sendMessage(input: {
  conversationId: string;
  body?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
}) {
  const session = await requireAuth();
  const user = {
    id: session.user.id,
    role: session.user.role as string,
    organizationId: session.user.organizationId,
  };

  const convo = await getAccessibleConversation(user, input.conversationId);
  if (!convo) throw new Error('Tidak punya akses ke percakapan ini');

  const body = (input.body ?? '').trim();
  if (!body && !input.attachmentUrl) throw new Error('Pesan kosong');

  const message = await prisma.message.create({
    data: {
      conversationId: convo.id,
      senderId: session.user.id,
      senderName: session.user.name ?? 'Pengguna',
      senderRole: user.role,
      body,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      attachmentName: input.attachmentName,
    },
  });

  await prisma.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date() },
  });

  await dispatchChatNotifications(convo, user, body || '📎 Lampiran');

  return {
    id: message.id,
    createdAt: message.createdAt.toISOString(),
  };
}

async function dispatchChatNotifications(
  convo: { id: string; type: string; organizationId: string; customerId: string | null },
  sender: { id: string; role: string },
  preview: string
) {
  if (convo.type === 'STAFF_DISCUSSION') {
    const roles = await prisma.userBranchRole.findMany({
      where: {
        role: { in: [Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WORKER] },
        branch: { organizationId: convo.organizationId },
      },
      select: { userId: true },
    });
    const ids = [...new Set(roles.map((r) => r.userId))].filter((id) => id !== sender.id);
    if (ids.length) {
      await prisma.notification.createMany({
        data: ids.map((userId) => ({
          userId,
          type: 'CHAT_STAFF',
          title: 'Pesan baru di Diskusi Tim',
          body: preview.slice(0, 80),
          data: JSON.stringify({ conversationId: convo.id }),
        })),
      });
    }
    return;
  }

  // CUSTOMER_SUPPORT
  if (sender.role === 'CUSTOMER') {
    // notify support staff
    const roles = await prisma.userBranchRole.findMany({
      where: {
        role: { in: [Role.OWNER, Role.MANAGER, Role.CASHIER] },
        branch: { organizationId: convo.organizationId },
      },
      select: { userId: true },
    });
    const ids = [...new Set(roles.map((r) => r.userId))];
    if (ids.length) {
      await prisma.notification.createMany({
        data: ids.map((userId) => ({
          userId,
          type: 'CHAT_CUSTOMER',
          title: 'Pesan baru dari pelanggan',
          body: preview.slice(0, 80),
          data: JSON.stringify({ conversationId: convo.id }),
        })),
      });
    }
  } else if (convo.customerId) {
    // staff replied -> notify the customer's user
    const customer = await prisma.customer.findUnique({
      where: { id: convo.customerId },
      select: { userId: true },
    });
    if (customer?.userId) {
      await prisma.notification.create({
        data: {
          userId: customer.userId,
          type: 'CHAT_CUSTOMER',
          title: 'Balasan dari AWW Laundry',
          body: preview.slice(0, 80),
          data: JSON.stringify({ conversationId: convo.id }),
        },
      });
    }
  }
  revalidatePath('/messages');
}
