import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Plus, Pin, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'featured' | 'private' | 'pinned';

interface ConversationItem {
  id: string;
  name: string | null;
  type: string;
  is_pinned: boolean;
  updated_at: string;
  is_member: boolean;
}

const InboxPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('featured');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isPrivateGroup, setIsPrivateGroup] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: memberships, error: membershipsError } = await supabase
      .from('conversation_members')
      .select('conversation_id, is_pinned')
      .eq('user_id', user.id);

    if (membershipsError) {
      toast.error('Failed to load inbox');
      setLoading(false);
      return;
    }

    const membershipRows = memberships || [];
    const membershipMap = new Map(membershipRows.map(row => [row.conversation_id, row.is_pinned]));
    const memberIds = membershipRows.map(row => row.conversation_id);

    const [memberConversationsResult, publicGroupsResult] = await Promise.all([
      memberIds.length
        ? supabase.from('conversations').select('id, name, type, updated_at').in('id', memberIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null; type: string; updated_at: string }[], error: null }),
      supabase.from('conversations').select('id, name, type, updated_at').eq('type', 'public_group').order('updated_at', { ascending: false }),
    ]);

    const baseConversations: ConversationItem[] = (memberConversationsResult.data || []).map(conversation => ({
      ...conversation,
      is_pinned: membershipMap.get(conversation.id) || false,
      is_member: true,
    }));

    const directConversationIds = baseConversations.filter(conversation => conversation.type === 'direct').map(conversation => conversation.id);

    if (directConversationIds.length) {
      const { data: allMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', directConversationIds);

      const otherUserIds = [...new Set((allMembers || []).filter(member => member.user_id !== user.id).map(member => member.user_id))];
      const { data: profiles } = otherUserIds.length
        ? await supabase.from('profiles').select('user_id, anonymous_name').in('user_id', otherUserIds)
        : { data: [] as { user_id: string; anonymous_name: string }[] };

      const profileMap = new Map((profiles || []).map(profile => [profile.user_id, profile.anonymous_name]));
      const directNameMap = new Map<string, string>();

      (allMembers || []).forEach(member => {
        if (member.user_id !== user.id && !directNameMap.has(member.conversation_id)) {
          directNameMap.set(member.conversation_id, profileMap.get(member.user_id) || 'Direct Chat');
        }
      });

      baseConversations.forEach(conversation => {
        if (conversation.type === 'direct') {
          conversation.name = directNameMap.get(conversation.id) || 'Direct Chat';
        }
      });
    }

    const merged = [...baseConversations];
    (publicGroupsResult.data || []).forEach(group => {
      const existing = merged.find(conversation => conversation.id === group.id);

      if (existing) {
        existing.name = group.name;
        existing.updated_at = group.updated_at;
        existing.type = group.type;
        return;
      }

      merged.push({ ...group, is_pinned: false, is_member: false });
    });

    merged.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setConversations(merged);

    setLoading(false);
  };

  useEffect(() => { fetchConversations(); }, [user, tab]);

  const filtered = conversations.filter(c => {
    if (tab === 'featured') return c.type === 'public_group';
    if (tab === 'private') return c.is_member && (c.type === 'direct' || c.type === 'private_group');
    if (tab === 'pinned') return c.is_member && c.is_pinned;
    return true;
  });

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;
    const type = isPrivateGroup ? 'private_group' : 'public_group';
    const conversationId = crypto.randomUUID();
    const { error: conversationError } = await supabase
      .from('conversations')
      .insert({ id: conversationId, name: newGroupName.trim(), type, created_by: user.id });

    if (conversationError) {
      toast.error('Failed to create group');
      return;
    }

    const { error: membershipError } = await supabase.from('conversation_members').insert({
      conversation_id: conversationId,
      user_id: user.id,
    });

    if (membershipError) {
      toast.error('Group created but joining failed');
      return;
    }

    toast.success('Group created!');
    setNewGroupName('');
    setShowCreate(false);
    fetchConversations();
    navigate(`/chat/${conversationId}`);
  };

  const handlePin = async (convId: string, currentlyPinned: boolean) => {
    if (!user) return;

    const conversation = conversations.find(item => item.id === convId);
    if (!conversation) return;

    if (!conversation.is_member) {
      const { error } = await supabase.from('conversation_members').insert({
        conversation_id: convId,
        user_id: user.id,
        is_pinned: true,
      });

      if (error) {
        toast.error('Failed to pin chat');
        return;
      }
    } else {
      const { error } = await supabase
        .from('conversation_members')
        .update({ is_pinned: !currentlyPinned })
        .eq('conversation_id', convId)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to update pin');
        return;
      }
    }

    fetchConversations();
  };

  const handleJoinGroup = async (convId: string) => {
    if (!user) return;

    const { error } = await supabase.from('conversation_members').insert({
      conversation_id: convId,
      user_id: user.id,
    });

    if (error) {
      toast.error('Failed to join group');
      return;
    }

    toast.success('Joined group!');
    fetchConversations();
    navigate(`/chat/${convId}`);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'featured', label: 'Groups' },
    { key: 'private', label: 'Private' },
    { key: 'pinned', label: 'Pinned' },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-bold">Inbox</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowCreate(true)}>
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="p-4 border-b border-border bg-card space-y-3 animate-fade-in">
          <Input
            placeholder="Group name"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            className="bg-background"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isPrivateGroup}
              onChange={e => setIsPrivateGroup(e.target.checked)}
              className="rounded"
            />
            Private group
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateGroup}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {tab === 'featured' ? 'No groups yet. Create one!' : tab === 'pinned' ? 'No pinned chats' : 'No private chats'}
          </div>
        ) : (
          filtered.map(c => {
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 p-4 hover:bg-card/50 transition-colors cursor-pointer"
                onClick={() => {
                  if (c.is_member) {
                    navigate(`/chat/${c.id}`);
                  } else {
                    handleJoinGroup(c.id);
                  }
                }}
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  {c.type === 'private_group' ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Users className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name || 'Direct Chat'}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.is_member ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : 'Tap to join'}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handlePin(c.id, c.is_pinned); }}
                  className={`p-1 ${c.is_pinned ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <Pin className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InboxPage;
