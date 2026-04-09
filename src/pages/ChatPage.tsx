import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  anonymous_name: string;
}

const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [convName, setConvName] = useState('Chat');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!id) return;
    const { data: conv } = await supabase.from('conversations').select('id, name, type').eq('id', id).single();

    if (conv?.type === 'direct' && user) {
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', id)
        .neq('user_id', user.id);

      const otherUserId = members?.[0]?.user_id;

      if (otherUserId) {
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('anonymous_name')
          .eq('user_id', otherUserId)
          .single();

        setConvName(otherProfile?.anonymous_name || 'Direct Chat');
      }
    } else if (conv?.name) {
      setConvName(conv.name);
    }

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      toast.error('Failed to load messages');
      return;
    }

    const messageRows = data || [];
    const senderIds = [...new Set(messageRows.map(message => message.sender_id))];
    const { data: profiles } = senderIds.length
      ? await supabase.from('profiles').select('user_id, anonymous_name').in('user_id', senderIds)
      : { data: [] as { user_id: string; anonymous_name: string }[] };

    const nameMap = new Map((profiles || []).map(profile => [profile.user_id, profile.anonymous_name]));
    setMessages(messageRows.map(message => ({ ...message, anonymous_name: nameMap.get(message.sender_id) || 'Anonymous' })));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        // Fetch fresh to get profile joins
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user?.id]);

  const handleSend = async () => {
    if (!input.trim() || !user || !id) return;
    const msg = input.trim();
    setInput('');
    const { error } = await supabase.from('messages').insert({
      conversation_id: id,
      sender_id: user.id,
      content: msg,
    });

    if (error) {
      setInput(msg);
      toast.error('Failed to send message');
      return;
    }

    fetchMessages();
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/inbox')}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold truncate">{convName}</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.map(m => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card text-card-foreground rounded-bl-sm'
              }`}>
                {!isMe && (
                  <p className="text-xs font-medium text-primary mb-0.5">
                    {m.anonymous_name}
                  </p>
                )}
                <p className="text-sm break-words">{m.content}</p>
                <p className={`text-[10px] mt-0.5 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 bg-background safe-bottom">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="bg-card border-border"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
