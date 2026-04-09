import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, Users, Pin, Settings, LogOut, MoreVertical, Trash2, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { getAvatar } from '@/lib/avatars';
import { GENDER_OPTIONS, DELETE_FOR_EVERYONE_LIMIT_MS } from '@/lib/constants';
import { containsProfanity, censorText } from '@/lib/profanity';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  anonymous_name: string;
  avatar_id: number;
  is_deleted_for_all: boolean;
  deleted_by_users: string[];
}

interface Member {
  user_id: string;
  role: string;
  anonymous_name: string;
  username: string;
  age: number | null;
  gender: string;
  points: number;
  avatar_id: number;
  is_online: boolean;
}

interface PinnedMsg {
  id: string;
  content: string;
  pinned_by: string;
  created_at: string;
}

const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isFounder } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [convName, setConvName] = useState('Chat');
  const [convType, setConvType] = useState('direct');
  const [convRules, setConvRules] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [myRole, setMyRole] = useState('member');
  const [showMembers, setShowMembers] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMsg[]>([]);
  const [newPin, setNewPin] = useState('');
  const [editingRules, setEditingRules] = useState(false);
  const [rulesText, setRulesText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [contextMsg, setContextMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isGroup = convType === 'public_group' || convType === 'private_group';
  const canModerate = isAdmin || isFounder || myRole === 'creator' || myRole === 'moderator';

  const fetchMessages = async () => {
    if (!id) return;
    const { data: conv } = await supabase.from('conversations').select('id, name, type, rules').eq('id', id).single();
    if (!conv) return;
    setConvType(conv.type);
    setConvRules(conv.rules || '');
    setRulesText(conv.rules || '');

    if (conv.type === 'direct' && user) {
      const { data: allMembers } = await supabase.from('conversation_members').select('user_id').eq('conversation_id', id).neq('user_id', user.id);
      const otherUserId = allMembers?.[0]?.user_id;
      if (otherUserId) {
        const { data: otherProfile } = await supabase.from('profiles').select('anonymous_name').eq('user_id', otherUserId).single();
        setConvName(otherProfile?.anonymous_name || 'Direct Chat');
      }
    } else {
      setConvName(conv.name || 'Group');
    }

    // Check membership
    const { data: myMembership } = await supabase.from('conversation_members').select('role, is_muted').eq('conversation_id', id).eq('user_id', user?.id || '').maybeSingle();
    setIsMember(!!myMembership);
    setMyRole(myMembership?.role || 'member');
    setIsMuted(myMembership?.is_muted || false);

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at, is_deleted_for_all, deleted_by_users')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) { toast.error('Failed to load messages'); return; }

    const messageRows = data || [];
    const senderIds = [...new Set(messageRows.map(m => m.sender_id))];
    const { data: profiles } = senderIds.length
      ? await supabase.from('profiles').select('user_id, anonymous_name, avatar_id').in('user_id', senderIds)
      : { data: [] as any[] };

    const nameMap = new Map((profiles || []).map(p => [p.user_id, { name: p.anonymous_name, avatar_id: p.avatar_id }]));
    setMessages(messageRows.map(m => ({
      ...m,
      anonymous_name: nameMap.get(m.sender_id)?.name || 'Anonymous',
      avatar_id: nameMap.get(m.sender_id)?.avatar_id || 1,
      deleted_by_users: (m as any).deleted_by_users || [],
    })));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const fetchMembers = async () => {
    if (!id) return;
    const { data: memberRows } = await supabase.from('conversation_members').select('user_id, role').eq('conversation_id', id);
    if (!memberRows?.length) return;
    const userIds = memberRows.map(m => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, anonymous_name, username, age, gender, points, avatar_id, is_online').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    setMembers(memberRows.map(m => {
      const p = profileMap.get(m.user_id);
      return {
        user_id: m.user_id,
        role: m.role || 'member',
        anonymous_name: p?.anonymous_name || 'Anonymous',
        username: p?.username || '',
        age: p?.age || null,
        gender: p?.gender || 'unspecified',
        points: p?.points || 0,
        avatar_id: p?.avatar_id || 1,
        is_online: p?.is_online || false,
      };
    }));
  };

  const fetchPinnedMessages = async () => {
    if (!id) return;
    const { data } = await supabase.from('pinned_messages').select('*').eq('conversation_id', id).order('created_at', { ascending: false });
    setPinnedMessages((data || []) as PinnedMsg[]);
  };

  useEffect(() => {
    fetchMessages();
    fetchPinnedMessages();

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
    if (containsProfanity(msg)) {
      msg = censorText(msg);
      toast.info('Profanity was filtered');
    }
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

  const handleLeave = async () => {
    if (!user || !id) return;
    await supabase.from('conversation_members').delete().eq('conversation_id', id).eq('user_id', user.id);
    toast.success('Left group');
    navigate('/inbox');
  };

  const handlePromote = async (targetId: string, role: string) => {
    if (!id || !user) return;
    await supabase.from('conversation_members').update({ role }).eq('conversation_id', id).eq('user_id', targetId);
    await supabase.from('audit_log').insert({ actor_id: user.id, action: role === 'moderator' ? 'promote_moderator' : 'demote_moderator', target_user_id: targetId, details: { conversation_id: id } });
    toast.success(`User ${role === 'moderator' ? 'promoted to moderator' : 'demoted to member'}`);
    fetchMembers();
  };

  const handleKickFromGroup = async (targetId: string) => {
    if (!id) return;
    await supabase.from('conversation_members').delete().eq('conversation_id', id).eq('user_id', targetId);
    toast.success('User removed from group');
    fetchMembers();
  };

  const handleSaveRules = async () => {
    if (!id) return;
    await supabase.from('conversations').update({ rules: rulesText }).eq('id', id);
    setConvRules(rulesText);
    setEditingRules(false);
    toast.success('Rules updated');
  };

  const handlePinMessage = async () => {
    if (!newPin.trim() || !id || !user) return;
    await supabase.from('pinned_messages').insert({ conversation_id: id, content: newPin.trim(), pinned_by: user.id });
    setNewPin('');
    fetchPinnedMessages();
    toast.success('Announcement pinned');
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

  const genderIcon = (g: string) => GENDER_OPTIONS.find(o => o.value === g)?.icon || '🤫';

  // Screenshot protection hint for DMs
  const isPrivateChat = convType === 'direct';

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/inbox')}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold truncate flex-1">{convName}</h1>
        {isGroup && (
          <div className="flex gap-1">
            <button onClick={() => { setShowPinned(!showPinned); setShowMembers(false); setShowRules(false); }} className="p-1 text-muted-foreground"><Pin className="w-4 h-4" /></button>
            <button onClick={() => { setShowMembers(!showMembers); setShowPinned(false); setShowRules(false); fetchMembers(); }} className="p-1 text-muted-foreground"><Users className="w-4 h-4" /></button>
            <button onClick={() => { setShowRules(!showRules); setShowMembers(false); setShowPinned(false); }} className="p-1 text-muted-foreground"><Settings className="w-4 h-4" /></button>
          </div>
        )}
        <button onClick={handleMuteToggle} className={`p-1 ${isMuted ? 'text-destructive' : 'text-muted-foreground'}`}>
          {isMuted ? '🔇' : '🔔'}
        </button>
      </header>

      {isPrivateChat && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-1.5 text-center">
          <p className="text-[10px] text-yellow-400">⚠️ Screenshots are discouraged. Respect privacy.</p>
        </div>
      )}

      {/* Pinned messages panel */}
      {showPinned && (
        <div className="border-b border-border bg-card p-4 space-y-3 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-bold">📌 Announcements</h3>
          {pinnedMessages.length === 0 && <p className="text-xs text-muted-foreground">No pinned announcements</p>}
          {pinnedMessages.map(p => (
            <div key={p.id} className="bg-background rounded-lg p-2 text-sm border border-border">{p.content}</div>
          ))}
          {canModerate && (
            <div className="flex gap-2">
              <Input value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New announcement..." className="bg-background text-sm" />
              <Button size="sm" onClick={handlePinMessage} disabled={!newPin.trim()}>Pin</Button>
            </div>
          )}
        </div>
      )}

      {/* Rules panel */}
      {showRules && (
        <div className="border-b border-border bg-card p-4 space-y-3 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-bold">📋 Group Rules</h3>
          {editingRules && canModerate ? (
            <div className="space-y-2">
              <textarea value={rulesText} onChange={e => setRulesText(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 text-sm text-foreground min-h-[80px]" maxLength={1000} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveRules}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingRules(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap">{convRules || 'No rules set'}</p>
              {canModerate && <Button size="sm" variant="ghost" onClick={() => setEditingRules(true)}>Edit Rules</Button>}
            </>
          )}
          {isGroup && isMember && (
            <Button size="sm" variant="destructive" onClick={handleLeave} className="mt-2"><LogOut className="w-3 h-3 mr-1" /> Leave Group</Button>
          )}
        </div>
      )}

      {/* Members panel */}
      {showMembers && (
        <div className="border-b border-border bg-card p-4 space-y-2 max-h-80 overflow-y-auto">
          <h3 className="text-sm font-bold">👥 Members ({members.length})</h3>
          {members.map(m => (
            <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-lg">{getAvatar(m.avatar_id).emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">{m.anonymous_name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.is_online ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                  {m.role !== 'member' && <span className="text-[10px] text-primary">({m.role})</span>}
                </div>
                <p className="text-[10px] text-muted-foreground">@{m.username} · {m.age || '?'}y · {genderIcon(m.gender)} · {m.points.toLocaleString()} pts</p>
              </div>
              <div className="flex gap-1">
                {m.user_id !== user?.id && (
                  <button onClick={() => {
                    supabase.rpc('create_direct_conversation', { other_user_id: m.user_id }).then(({ data }) => {
                      if (data) navigate(`/chat/${data}`);
                    });
                  }} className="text-xs text-muted-foreground hover:text-primary p-1">💬</button>
                )}
                {canModerate && m.user_id !== user?.id && m.role !== 'creator' && (
                  <>
                    {m.role === 'member' ? (
                      <button onClick={() => handlePromote(m.user_id, 'moderator')} className="text-xs text-muted-foreground hover:text-primary p-1">⬆️</button>
                    ) : m.role === 'moderator' ? (
                      <button onClick={() => handlePromote(m.user_id, 'member')} className="text-xs text-muted-foreground hover:text-primary p-1">⬇️</button>
                    ) : null}
                    <button onClick={() => handleKickFromGroup(m.user_id)} className="text-xs text-muted-foreground hover:text-destructive p-1">🚫</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.filter(m => {
          if (m.is_deleted_for_all) return false;
          if (m.deleted_by_users?.includes(user?.id || '')) return false;
          return true;
        }).map(m => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card text-card-foreground rounded-bl-sm'}`}
                onContextMenu={e => { e.preventDefault(); setContextMsg(contextMsg === m.id ? null : m.id); }}
                onClick={() => setContextMsg(null)}>
                {!isMe && (
                  <button onClick={() => navigate(`/user/${m.sender_id}`)} className="text-xs font-medium text-primary mb-0.5 block">
                    {getAvatar(m.avatar_id).emoji} {m.anonymous_name}
                  </button>
                )}
                <p className="text-sm break-words">{m.content}</p>
                <p className={`text-[10px] mt-0.5 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
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
    </div>
  );
};

export default ChatPage;
