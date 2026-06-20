import { getOrCreateCustomerConversation } from '@/app/actions/chat';
import { ChatThread } from '@/components/chat/chat-thread';
import { MessageCircle } from 'lucide-react';

export default async function CustomerChatPage() {
  const conversationId = await getOrCreateCustomerConversation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aww-rainbow text-white shadow-aww-glow-rainbow">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold text-brand-navy">Chat dengan AWW Laundry</h1>
          <p className="text-sm text-brand-navy/55">Tanya apa saja, tim kami siap membantu</p>
        </div>
      </div>
      <ChatThread conversationId={conversationId} heightClass="h-[calc(100dvh-15rem)]" />
    </div>
  );
}
