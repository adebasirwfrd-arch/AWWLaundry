import { NextResponse } from 'next/server';
import { prisma } from '@aww/database';
import { auth } from '@/lib/auth';
import { getAccessibleConversation } from '@/lib/chat';
import { resolveApiAccessUser } from '@/lib/api-access-user';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const accessUser = await resolveApiAccessUser(
    session as typeof session & { user: NonNullable<typeof session.user> & { id: string } }
  );
  if (!accessUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const convo = await getAccessibleConversation(accessUser, id);
  if (!convo) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json({
    currentUserId: accessUser.id,
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
