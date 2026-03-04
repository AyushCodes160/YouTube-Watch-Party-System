import { useState, useRef, useEffect } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type Message = Tables<'room_messages'>;

interface ChatPanelProps {
  messages: Message[];
  onSend: (content: string) => void;
  currentUserId: string;
}

export function ChatPanel({ messages, onSend, currentUserId }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Chat</span>
        <span className="text-xs text-muted-foreground ml-auto">{messages.length} msgs</span>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${msg.user_id === currentUserId ? 'text-right' : ''}`}
            >
              <span className="text-xs text-muted-foreground">{msg.username}</span>
              <div
                className={`inline-block px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                  msg.user_id === currentUserId
                    ? 'bg-primary/20 text-foreground ml-auto'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="bg-secondary border-border text-sm"
          maxLength={500}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button size="icon" variant="ghost" onClick={handleSend} disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
