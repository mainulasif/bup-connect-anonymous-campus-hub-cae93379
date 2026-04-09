import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, Settings, Bell, BellOff, Gift } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AvatarImg from '@/components/AvatarImg';
import GiftDialog from '@/components/GiftDialog';
import { DELETE_FOR_EVERYONE_LIMIT_MS } from '@/lib/constants';
import { containsProfanity, censorText } from '@/lib/profanity';

interface Message {
  id: string; sender_id: string; content: string; created_at: string;
  anonymous_name: string; avatar_id: number; is_deleted_for_all: boolean;
  deleted_by_users: string[]; bubble_color?: string;
}

const BUBBLE_COLOR_MAP: Record<string, string> = {
  'bg-primary': 'hsl(var(--primary))',
  'bg-blue-600': '#2563eb',
  'bg-orange-500': '#f97316',
  'bg-emerald-500': '#10b981',
  'bg-purple-600': '#9333ea',
  'bg-pink-400': '#f472b6',
  'bg-cyan-400': '#22d3ee',
};

const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isFounder } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [convName, setConvName] = useState('Chat');
  const [convType, setConvType] = useState('direct');
  const [isMember, setIsMember] = useState(false);
  const [myRole, setMyRole] = useState('member');
  const [isMuted, setIsMuted] = useState(false);
  const [contextMsg, setContextMsg] = useState<string | null>(null);
  const [showGift, setShowGift] = useState(false);
  const [giftReceiverId, setGiftReceiverId] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const isGroup = convType === 'public_group' || convType === 'private_group';
  const canModerate = isAdmin || isFounder || myRole === 'creator' || myRole === 'moderator';

  const fetchMessages = async () => {
    if (!id) return;
    const { data: conv } = await supabase.from('conversations').select('id, name, type, rules').eq('id', id).single();
    if (!conv) return;
    setConvType(conv.type);

    if (conv.type === 'direct' && user) {
      const { data: allMembers } = await supabase.from('conversation_members').select('user_id').eq('conversation_id', id).neq('user_id', user.id);
      const otherUserId = allMembers?.[0]?.user_id;
      if (otherUserId) {
        setGiftReceiverId(otherUserId);
        const { data: otherProfile } = await supabase.from('profiles').select('anonymous_name').eq('user_id', otherUserId).single();
        setConvName(otherProfile?.anonymous_name || 'Direct Chat');
      }
    } else {
      setConvName(conv.name || 'Group');
    }

    const { data: myMembership } = await supabase.from('conversation_members').select('role, is_muted').eq('conversation_id', id).eq('user_id', user?.id || '').maybeSingle();
    setIsMember(!!myMembership);
    setMyRole(myMembership?.role || 'member');
    setIsMuted(myMembership?.is_muted || false);

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at, is_deleted_for_all, deleted_by_users')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) { toast.error('Failed to load messages'); return; }

    const messageRows = data || [];
    const senderIds = [...new Set(messageRows.map(m => m.sender_id))];
    const { data: profiles } = senderIds.length
      ? await supabase.from('profiles').select('user_id, anonymous_name, avatar_id, bubble_color').in('user_id', senderIds)
      : { data: [] as any[] };

    const nameMap = new Map((profiles || []).map(p => [p.user_id, { name: p.anonymous_name, avatar_id: p.avatar_id, bubble_color: p.bubble_color }]));
    setMessages(messageRows.map(m => ({
      ...m,
      anonymous_name: nameMap.get(m.sender_id)?.name || 'Anonymous',
      avatar_id: nameMap.get(m.sender_id)?.avatar_id || 1,
      bubble_color: nameMap.get(m.sender_id)?.bubble_color || null,
      deleted_by_users: (m as any).deleted_by_users || [],
    })));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user?.id]);

  const handleSend = async () => {
    if (!input.trim() || !user || !id) return;
    if (isMuted) { toast.error('You are muted in this chat'); return; }
    let msg = input.trim();
    if (containsProfanity(msg)) { msg = censorText(msg); toast.info('Profanity was filtered'); }
    setInput('');
    const { error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: user.id, content: msg });
    if (error) { setInput(msg); toast.error('Failed to send'); return; }
    fetchMessages();
  };

  const handleJoin = async () => {
    if (!user || !id) return;
    const { error } = await supabase.from('conversation_members').insert({ conversation_id: id, user_id: user.id });
    if (error) { toast.error('Failed to join'); return; }
    toast.success('Joined!');
    setIsMember(true);
    fetchMessages();
  };

  const handleDeleteMessage = async (msgId: string, forEveryone: boolean) => {
    if (!user) return;
    if (forEveryone) {
      const msg = messages.find(m => m.id === msgId);
      if (msg) {
        const elapsed = Date.now() - new Date(msg.created_at).getTime();
        if (elapsed > DELETE_FOR_EVERYONE_LIMIT_MS && !isAdmin) {
          toast.error('Cannot delete for everyone after 5 minutes');
          return;
        }
      }
      await supabase.from('messages').update({ is_deleted_for_all: true }).eq('id', msgId);
    } else {
      const msg = messages.find(m => m.id === msgId);
      const currentDeleted = msg?.deleted_by_users || [];
      await supabase.from('messages').update({ deleted_by_users: [...currentDeleted, user.id] }).eq('id', msgId);
    }
    fetchMessages();
    setContextMsg(null);
  };

  const handleMuteToggle = async () => {
    if (!id || !user) return;
    await supabase.from('conversation_members').update({ is_muted: !isMuted }).eq('conversation_id', id).eq('user_id', user.id);
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'Unmuted' : 'Muted');
  };

  const getBubbleStyle = (bubbleColor: string | undefined, isMe: boolean) => {
    if (!isMe || !bubbleColor || bubbleColor === 'bg-primary') return {};
    if (bubbleColor.includes('gradient')) {
      return { background: 'linear-gradient(to right, #8b5cf6, #22d3ee)' };
    }
    const color = BUBBLE_COLOR_MAP[bubbleColor];
    return color ? { backgroundColor: color } : {};
  };

  const isPrivateChat = convType === 'direct';

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/inbox')}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold truncate flex-1">{convName}</h1>
        {isPrivateChat && giftReceiverId && (
          <button onClick={() => setShowGift(true)} className="p-1 text-muted-foreground">
            <Gift className="w-5 h-5" />
          </button>
        )}
        {isGroup && (
          <button onClick={() => navigate(`/group/${id}/settings`)} className="p-1 text-muted-foreground">
            <Settings className="w-5 h-5" />
          </button>
        )}
        <button onClick={handleMuteToggle} className={`p-1 ${isMuted ? 'text-destructive' : 'text-muted-foreground'}`}>
          {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
      </header>

      {isPrivateChat && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-1.5 text-center">
          <p className="text-[10px] text-yellow-400">Screenshots are discouraged. Respect privacy.</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.filter(m => {
          if (m.is_deleted_for_all) return false;
          if (m.deleted_by_users?.includes(user?.id || '')) return false;
          return true;
        }).map(m => {
          const isMe = m.sender_id === user?.id;
          const bubbleStyle = getBubbleStyle(m.bubble_color, isMe);
          const hasCustomBubble = isMe && Object.keys(bubbleStyle).length > 0;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMe ? (hasCustomBubble ? 'text-white rounded-br-sm' : 'bg-primary text-primary-foreground rounded-br-sm') : 'bg-card text-card-foreground rounded-bl-sm'}`}
                style={bubbleStyle}
                onContextMenu={e => { e.preventDefault(); setContextMsg(contextMsg === m.id ? null : m.id); }}
                onClick={() => setContextMsg(null)}>
                {!isMe && (
                  <button onClick={() => navigate(`/user/${m.sender_id}`)} className="text-xs font-medium text-primary mb-0.5 flex items-center gap-1">
                    <AvatarImg avatarId={m.avatar_id} size="sm" className="w-4 h-4" /> {m.anonymous_name}
                  </button>
                )}
                <p className="text-sm break-words">{m.content}</p>
                <p className={`text-[10px] mt-0.5 ${isMe ? (hasCustomBubble ? 'text-white/60' : 'text-primary-foreground/60') : 'text-muted-foreground'}`}>
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </p>
                {contextMsg === m.id && (
                  <div className="mt-1 flex gap-1">
                    {isMe && <button onClick={e => { e.stopPropagation(); handleDeleteMessage(m.id, false); }} className="text-[10px] bg-muted rounded px-1.5 py-0.5">Delete for me</button>}
                    {(isMe || canModerate) && <button onClick={e => { e.stopPropagation(); handleDeleteMessage(m.id, true); }} className="text-[10px] bg-destructive/20 text-destructive rounded px-1.5 py-0.5">Delete for all</button>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!isMember && isGroup ? (
        <div className="border-t border-border p-3 bg-background safe-bottom text-center">
          <Button onClick={handleJoin}>Join Group</Button>
        </div>
      ) : (
        <div className="border-t border-border p-3 bg-background safe-bottom">
          <div className="flex gap-2">
            <Input placeholder={isMuted ? 'You are muted' : 'Type a message...'} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="bg-card border-border" disabled={isMuted} />
            <button onClick={handleSend} disabled={!input.trim() || isMuted} className="p-2.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <GiftDialog open={showGift} onClose={() => setShowGift(false)} receiverId={giftReceiverId} conversationId={id} />
    </div>
  );
};

export default ChatPage;