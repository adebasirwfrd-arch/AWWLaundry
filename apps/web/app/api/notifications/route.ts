import { NextResponse } from 'next/server';
import { prisma } from '@aww/database';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({
    unreadCount,
    userId: session.user.id,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      read: !!n.readAt,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
