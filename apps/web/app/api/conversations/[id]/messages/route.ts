import { NextResponse } from 'next/server';
import { prisma } from '@aww/database';
import { auth } from '@/lib/auth';
import { getAccessibleConversation } from '@/lib/chat';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const convo = await getAccessibleConversation(
    {
      id: session.user.id,
      role: session.user.role as string,
      organizationId: session.user.organizationId,
      branchId: session.user.branchId,
    },
    id
  );
  if (!convo) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json({
    currentUserId: session.user.id,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      body: m.body,
      attachmentUrl: m.attachmentUrl,
      attachmentType: m.attachmentType,
      attachmentName: m.attachmentName,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
