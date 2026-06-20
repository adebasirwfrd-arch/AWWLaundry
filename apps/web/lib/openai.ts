import { getOpenAIModel, isOpenAIConfigured } from './env';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Kamu adalah asisten AWW Laundry — laundry franchise Indonesia yang ramah dan profesional.
Tema brand: FRESH • CLEAN • FUN.
Jawab dalam Bahasa Indonesia, singkat dan membantu.
Topik: layanan cuci (kiloan/satuan), tracking pesanan, poin loyalty, jam operasional, cara pesan via app.
Jika tidak tahu detail spesifik cabang, arahkan pelanggan hubungi kasir via chat app.`;

export async function chatCompletion(messages: ChatMessage[], kind: 'chatbot' | 'business' = 'chatbot') {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI belum dikonfigurasi. Set OPENAI_API_KEY di .env.local');
  }

  const model = getOpenAIModel(kind);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS ?? 1024),
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content?.trim() ?? 'Maaf, saya tidak bisa memproses permintaan saat ini.';
}
