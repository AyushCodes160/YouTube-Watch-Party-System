import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Plus } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { ChatMessage } from '@/hooks/useWatchParty';

interface ChatBoxProps {
  messages: ChatMessage[];
  currentUserId: string | undefined;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  lastReaction?: { emoji: string; timestamp: number } | null;
}

export function ChatBox({ messages, currentUserId, onSendMessage, onSendReaction, lastReaction }: ChatBoxProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastReaction) {
      const id = lastReaction.timestamp;
      const x = Math.random() * 70 + 15; // 15% to 85% to stay clear of edges
      setFloatingEmojis((prev) => [...prev, { id, emoji: lastReaction.emoji, x }]);
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
      }, 3000);
    }
  }, [lastReaction]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const onEmojiClick = (emojiData: any) => {
    onSendReaction(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card relative overflow-hidden">
      {/* Floating Emojis Layer - Contained within ChatBox */}
      <div className="absolute inset-0 pointer-events-none z-[50] overflow-hidden">
        {floatingEmojis.map((e) => (
          <motion.div
            key={e.id}
            initial={{ bottom: '80px', left: `${e.x}%`, opacity: 0, scale: 0.5, y: 0 }}
            animate={{ 
              y: -300, 
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.2, 1.2, 0.8],
              rotate: [0, 15, -15, 0]
            }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute text-3xl select-none"
          >
            {e.emoji}
          </motion.div>
        ))}
      </div>

      <div className="border-b border-border/50 px-4 py-3">
        <h3 className="text-sm font-semibold">Room Chat</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {/* ... existing messages ... */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-10 text-sm text-muted-foreground">
              No messages yet. Say hello!
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isMe = msg.userId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1`}
                  >
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {isMe ? 'You' : msg.username}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-secondary text-secondary-foreground rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 p-3 space-y-3 relative">
        {showEmojiPicker && (
          <div ref={pickerRef} className="absolute bottom-full left-0 z-[1000] mb-2">
            <EmojiPicker 
              onEmojiClick={onEmojiClick}
              theme={Theme.DARK}
              lazyLoadEmojis={true}
                                  width={300}
                                  height={400}
            />
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {['🔥', '❤️', '😂', '😮', '👏'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendReaction(emoji)}
                className="text-lg transition-transform hover:scale-125 active:scale-90"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-all hover:bg-secondary/80 hover:scale-110 active:scale-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
