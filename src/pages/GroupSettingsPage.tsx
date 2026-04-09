import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, LogOut, ChevronUp, ChevronDown, UserMinus, MessageCircle, Pin, BookOpen, Copy, User, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AvatarImg from '@/components/AvatarImg';

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

const GroupSettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isFounder } = useAuth();
  const navigate = useNavigate();
  const [convName, setConvName] = useState('');
  const [convType, setConvType] = useState('');
  const [convRules, setConvRules] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMsg[]>([]);
  const [myRole, setMyRole] = useState('member');
  const [isMember, setIsMember] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [rulesText, setRulesText] = useState('');
  const [newPin, setNewPin] = useState('');

  const canModerate = isAdmin || isFounder || myRole === 'creator' || myRole === 'moderator';
  const canPromoteDemote = isAdmin || isFounder || myRole === 'creator';

  const fetchData = async () => {
    if (!id) return;
    const { data: conv } = await supabase.from('conversations').select('*').eq('id', id).single();
    if (!conv) return;
    setConvName(conv.name || 'Group');
    setConvType(conv.type);
    setConvRules(conv.rules || '');
    setRulesText(conv.rules || '');
    setCreatedBy(conv.created_by || '');

    const { data: myMembership } = await supabase.from('conversation_members').select('role').eq('conversation_id', id).eq('user_id', user?.id || '').maybeSingle();
    setIsMember(!!myMembership);
    setMyRole(myMembership?.role || 'member');

    const { data: memberRows } = await supabase.from('conversation_members').select('user_id, role').eq('conversation_id', id);
    if (memberRows?.length) {
      const userIds = memberRows.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, anonymous_name, username, age, gender, points, avatar_id, is_online').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setMembers(memberRows.map(m => {
        const p = profileMap.get(m.user_id);
        return {
          user_id: m.user_id, role: m.role || 'member',
          anonymous_name: p?.anonymous_name || 'Anonymous', username: p?.username || '',
          age: p?.age || null, gender: p?.gender || 'unspecified',
          points: p?.points || 0, avatar_id: p?.avatar_id || 1, is_online: p?.is_online || false,
        };
      }));
    }

    const { data: pins } = await supabase.from('pinned_messages').select('*').eq('conversation_id', id).order('created_at', { ascending: false });
    setPinnedMessages((pins || []) as PinnedMsg[]);
  };

  useEffect(() => { fetchData(); }, [id, user?.id]);

  const handleLeave = async () => {
    if (!user || !id) return;
    await supabase.from('conversation_members').delete().eq('conversation_id', id).eq('user_id', user.id);
    toast.success('Left group');
    navigate('/inbox');
  };

  const handleJoin = async () => {
    if (!user || !id) return;
    const { error } = await supabase.from('conversation_members').insert({ conversation_id: id, user_id: user.id });
    if (error) { toast.error('Failed to join'); return; }
    toast.success('Joined!');
    fetchData();
  };

  const handlePromote = async (targetId: string, role: string) => {
    if (!id || !user) return;
    await supabase.from('conversation_members').update({ role }).eq('conversation_id', id).eq('user_id', targetId);
    await supabase.from('audit_log').insert({ actor_id: user.id, action: role === 'moderator' ? 'promote_moderator' : 'demote_moderator', target_user_id: targetId, details: { conversation_id: id } });
    toast.success(`User ${role === 'moderator' ? 'promoted' : 'demoted'}`);
    fetchData();
  };

  const handleKick = async (targetId: string) => {
    if (!id) return;
    await supabase.from('conversation_members').delete().eq('conversation_id', id).eq('user_id', targetId);
    toast.success('User removed');
    fetchData();
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
    fetchData();
    toast.success('Announcement pinned');
  };

  const GenderIconSmall: React.FC<{ value: string }> = ({ value }) => {
    if (value === 'male') return <User className="w-3 h-3 text-muted-foreground" />;
    if (value === 'female') return <UserRound className="w-3 h-3 text-muted-foreground" />;
    return null;
  };

  const getRoleLabel = (role: string) => {
    if (role === 'creator') return { label: 'Creator', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    if (role === 'moderator') return { label: 'Chat Mod', className: 'bg-pink-500/20 text-pink-400 border-pink-500/30' };
    return null;
  };

  return (
    <div className="max-w-lg mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/chat/${id}`)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold truncate">Group Settings</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Group Info */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <h2 className="text-lg font-bold">{convName}</h2>
          <p className="text-xs text-muted-foreground">{convType === 'public_group' ? 'Public Group' : 'Private Group'} · {members.length} members</p>
          {convType === 'private_group' && (
            <button onClick={() => { navigator.clipboard.writeText(window.location.origin + `/chat/${id}`); toast.success('Link copied!'); }}
              className="flex items-center gap-1 text-xs text-primary mt-1">
              <Copy className="w-3 h-3" /> Copy invite link
            </button>
          )}
          <div className="flex gap-2 mt-3">
            {isMember ? (
              <Button size="sm" variant="destructive" onClick={handleLeave}><LogOut className="w-3 h-3 mr-1" /> Leave</Button>
            ) : (
              <Button size="sm" onClick={handleJoin}>Join Group</Button>
            )}
          </div>
        </div>

        {/* Rules */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Group Rules</h3>
          </div>
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
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{convRules || 'No rules set'}</p>
              {canModerate && <Button size="sm" variant="ghost" onClick={() => setEditingRules(true)}>Edit Rules</Button>}
            </>
          )}
        </div>

        {/* Pinned */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Announcements</h3>
          </div>
          {pinnedMessages.length === 0 && <p className="text-xs text-muted-foreground">No announcements</p>}
          {pinnedMessages.map(p => (
            <div key={p.id} className="bg-background rounded-lg p-2 text-sm border border-border">{p.content}</div>
          ))}
          {canModerate && (
            <div className="flex gap-2 mt-2">
              <Input value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New announcement..." className="bg-background text-sm" />
              <Button size="sm" onClick={handlePinMessage} disabled={!newPin.trim()}>Pin</Button>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <h3 className="text-sm font-semibold">Members ({members.length})</h3>
          <div className="space-y-1">
            {members.map(m => {
              const roleInfo = getRoleLabel(m.role);
              return (
                <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <AvatarImg avatarId={m.avatar_id} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{m.anonymous_name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.is_online ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                      {roleInfo && (
                        <span className={`text-[9px] font-semibold rounded-full border px-1.5 py-0.5 ${roleInfo.className}`}>
                          {roleInfo.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>@{m.username}</span>
                      <span>·</span>
                      <span>{m.age || '?'}y</span>
                      <GenderIconSmall value={m.gender} />
                      <span>·</span>
                      <span>{m.points.toLocaleString()} pts</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {m.user_id !== user?.id && (
                      <button onClick={() => {
                        supabase.rpc('create_direct_conversation', { other_user_id: m.user_id }).then(({ data }) => {
                          if (data) navigate(`/chat/${data}`);
                        });
                      }} className="p-1 text-muted-foreground hover:text-primary"><MessageCircle className="w-3.5 h-3.5" /></button>
                    )}
                    {canPromoteDemote && m.user_id !== user?.id && m.role !== 'creator' && (
                      <>
                        {m.role === 'member' && (
                          <button onClick={() => handlePromote(m.user_id, 'moderator')} className="p-1 text-muted-foreground hover:text-primary" title="Promote to Chat Mod">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {m.role === 'moderator' && (
                          <button onClick={() => handlePromote(m.user_id, 'member')} className="p-1 text-muted-foreground hover:text-orange-400" title="Demote from Chat Mod">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                    {canModerate && m.user_id !== user?.id && m.role !== 'creator' && (
                      <button onClick={() => handleKick(m.user_id)} className="p-1 text-muted-foreground hover:text-destructive"><UserMinus className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsPage;
