import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { chatCompletion } from '@/lib/openai';
import { isOpenAIConfigured } from '@/lib/env';

export async function POST(req: Request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: 'OpenAI belum dikonfigurasi' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { messages?: { role: 'user' | 'assistant'; content: string }[] };
  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 });
  }

  try {
    const reply = await chatCompletion(
      messages.map((m) => ({ role: m.role, content: m.content })),
      'chatbot'
    );
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI error' },
      { status: 500 }
    );
  }
}
