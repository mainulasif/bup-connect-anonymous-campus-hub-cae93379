import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, Settings, Bell, BellOff, Gift, Smile, Flag, Ban, Reply } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AvatarImg from '@/components/AvatarImg';
import GiftDialog from '@/components/GiftDialog';
import ReportDialog from '@/components/ReportDialog';
import StickerPicker from '@/components/StickerPicker';
import { DELETE_FOR_EVERYONE_LIMIT_MS, BAN_DURATIONS } from '@/lib/constants';
import { containsProfanity, censorText } from '@/lib/profanity';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string; sender_id: string; content: string; created_at: string;
  anonymous_name: string; avatar_id: number; is_deleted_for_all: boolean;
  deleted_by_users: string[]; bubble_color?: string; reply_to_id?: string;
  reply_preview?: string; reply_name?: string;
}

import { getBubbleBackground } from '@/lib/bubbleColors';

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
  const [showStickers, setShowStickers] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; content: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ userId?: string; messageContent?: string } | null>(null);
  const [banDialog, setBanDialog] = useState<{ userId: string; name: string } | null>(null);
  const [banDuration, setBanDuration] = useState(1440);
  const [banReason, setBanReason] = useState('');
  const [punishAction, setPunishAction] = useState<'ban' | 'jail'>('ban');
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
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

    // Fetch blocked users
    if (user) {
      const { data: blocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id);
      setBlockedIds(new Set((blocks || []).map(b => b.blocked_id)));
    }

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at, is_deleted_for_all, deleted_by_users, reply_to_id')
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
    
    // Build reply previews
    const replyIds = messageRows.filter(m => m.reply_to_id).map(m => m.reply_to_id!);
    const replyMap = new Map<string, { content: string; name: string }>();
    if (replyIds.length) {
      const { data: replyMsgs } = await supabase.from('messages').select('id, content, sender_id').in('id', replyIds);
      (replyMsgs || []).forEach(rm => {
        replyMap.set(rm.id, { content: rm.content.slice(0, 50), name: nameMap.get(rm.sender_id)?.name || 'Someone' });
      });
    }

    setMessages(messageRows.map(m => ({
      ...m,
      anonymous_name: nameMap.get(m.sender_id)?.name || 'Anonymous',
      avatar_id: nameMap.get(m.sender_id)?.avatar_id || 1,
      bubble_color: nameMap.get(m.sender_id)?.bubble_color || null,
      deleted_by_users: (m as any).deleted_by_users || [],
      reply_preview: m.reply_to_id ? replyMap.get(m.reply_to_id)?.content : undefined,
      reply_name: m.reply_to_id ? replyMap.get(m.reply_to_id)?.name : undefined,
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
    const insertData: any = { conversation_id: id, sender_id: user.id, content: msg };
    if (replyTo) insertData.reply_to_id = replyTo.id;
    const { error } = await supabase.from('messages').insert(insertData);
    if (error) { setInput(msg); toast.error('Failed to send'); return; }
    setReplyTo(null);
    fetchMessages();
  };

  const handleStickerSend = async (sticker: string) => {
    if (!user || !id) return;
    if (isMuted) { toast.error('You are muted'); return; }
    await supabase.from('messages').insert({ conversation_id: id, sender_id: user.id, content: sticker });
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

  const handlePunish = async () => {
    if (!banDialog || !user || !banReason.trim()) { toast.error('Reason is required'); return; }
    const duration = banDuration === 0 ? null : banDuration;
    const { error } = await supabase.rpc('admin_punish_user', {
      _admin_id: user.id, _target_user_id: banDialog.userId, _action: punishAction,
      _duration_minutes: duration, _reason: banReason,
    });
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success(`User ${punishAction === 'ban' ? 'banned' : 'jailed'}`);
    setBanDialog(null); setBanReason('');
  };

  const getBubbleStyle = (bubbleColor: string | undefined, isMe: boolean) => {
    if (!isMe || !bubbleColor || bubbleColor === 'bg-primary') return {};
    const bg = getBubbleBackground(bubbleColor);
    if (!bg) return {};
    return bg.startsWith('linear') ? { background: bg } : { backgroundColor: bg };
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
          if (blockedIds.has(m.sender_id)) return false;
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
                {/* Reply preview */}
                {m.reply_preview && (
                  <div className={`text-[10px] mb-1 px-2 py-1 rounded border-l-2 ${isMe ? 'border-white/40 bg-white/10' : 'border-primary/40 bg-primary/5'}`}>
                    <span className="font-medium">{m.reply_name}</span>
                    <p className="truncate opacity-70">{m.reply_preview}</p>
                  </div>
                )}
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
                  <div className="mt-1 flex flex-wrap gap-1">
                    <button onClick={e => { e.stopPropagation(); setReplyTo({ id: m.id, name: m.anonymous_name, content: m.content.slice(0, 50) }); setContextMsg(null); }}
                      className="text-[10px] bg-muted rounded px-1.5 py-0.5 flex items-center gap-0.5"><Reply className="w-3 h-3" /> Reply</button>
                    {isMe && <button onClick={e => { e.stopPropagation(); handleDeleteMessage(m.id, false); }} className="text-[10px] bg-muted rounded px-1.5 py-0.5">Delete for me</button>}
                    {(isMe || canModerate) && <button onClick={e => { e.stopPropagation(); handleDeleteMessage(m.id, true); }} className="text-[10px] bg-destructive/20 text-destructive rounded px-1.5 py-0.5">Delete for all</button>}
                    {!isMe && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setReportTarget({ userId: m.sender_id, messageContent: m.content }); setContextMsg(null); }}
                          className="text-[10px] bg-yellow-500/20 text-yellow-400 rounded px-1.5 py-0.5 flex items-center gap-0.5"><Flag className="w-3 h-3" /> Report</button>
                        {canModerate && (
                          <button onClick={e => { e.stopPropagation(); setBanDialog({ userId: m.sender_id, name: m.anonymous_name }); setContextMsg(null); }}
                            className="text-[10px] bg-destructive/20 text-destructive rounded px-1.5 py-0.5 flex items-center gap-0.5"><Ban className="w-3 h-3" /> Ban/Jail</button>
                        )}
                      </>
                    )}
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
        <div className="border-t border-border p-3 bg-background safe-bottom relative">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-muted rounded-lg text-xs">
              <Reply className="w-3 h-3 text-primary" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-primary">{replyTo.name}</span>
                <p className="truncate text-muted-foreground">{replyTo.content}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground">✕</button>
            </div>
          )}
          {showStickers && <StickerPicker onSelect={handleStickerSend} onClose={() => setShowStickers(false)} />}
          <div className="flex gap-2">
            <button onClick={() => setShowStickers(!showStickers)} className="p-2.5 text-muted-foreground hover:text-foreground">
              <Smile className="w-5 h-5" />
            </button>
            <Input placeholder={isMuted ? 'You are muted' : 'Type a message...'} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="bg-card border-border" disabled={isMuted} />
            <button onClick={handleSend} disabled={!input.trim() || isMuted} className="p-2.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <GiftDialog open={showGift} onClose={() => setShowGift(false)} receiverId={giftReceiverId} conversationId={id} />
      
      {reportTarget && (
        <ReportDialog open={!!reportTarget} onClose={() => setReportTarget(null)} reportedUserId={reportTarget.userId} />
      )}

      {banDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold">Punish {banDialog.name}</h3>
            <div className="flex gap-2">
              <Button size="sm" variant={punishAction === 'ban' ? 'default' : 'ghost'} onClick={() => setPunishAction('ban')}><Ban className="w-3 h-3 mr-1" /> Ban</Button>
              <Button size="sm" variant={punishAction === 'jail' ? 'default' : 'ghost'} onClick={() => setPunishAction('jail')}>Jail</Button>
            </div>
            <select value={banDuration} onChange={e => setBanDuration(Number(e.target.value))} className="w-full bg-background border border-border rounded-lg p-2 text-sm text-foreground">
              {BAN_DURATIONS.map(d => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
            </select>
            <Textarea placeholder="Reason (required)" value={banReason} onChange={e => setBanReason(e.target.value)} className="bg-background border-border" maxLength={500} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setBanDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handlePunish} disabled={!banReason.trim()}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
