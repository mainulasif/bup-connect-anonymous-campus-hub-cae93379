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
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id, is_pinned, conversations(id, name, type, updated_at)')
      .eq('user_id', user.id);

    if (memberships) {
      const convs: ConversationItem[] = memberships.map((m: any) => ({
        id: m.conversations.id,
        name: m.conversations.name,
        type: m.conversations.type,
        is_pinned: m.is_pinned,
        updated_at: m.conversations.updated_at,
      }));
      setConversations(convs);
    }

    // Also fetch public groups user hasn't joined
    if (tab === 'featured') {
      const { data: publicGroups } = await supabase
        .from('conversations')
        .select('id, name, type, updated_at')
        .eq('type', 'public_group');

      if (publicGroups) {
        const existingIds = new Set(conversations.map(c => c.id));
        const newPublic = publicGroups
          .filter(g => !existingIds.has(g.id))
          .map(g => ({ ...g, is_pinned: false }));
        setConversations(prev => {
          const merged = [...prev];
          newPublic.forEach(np => {
            if (!merged.find(m => m.id === np.id)) merged.push(np);
          });
          return merged;
        });
      }
    }

    setLoading(false);
  };

  useEffect(() => { fetchConversations(); }, [user, tab]);

  const filtered = conversations.filter(c => {
    if (tab === 'featured') return c.type === 'public_group';
    if (tab === 'private') return c.type === 'direct' || c.type === 'private_group';
    if (tab === 'pinned') return c.is_pinned;
    return true;
  });

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;
    const type = isPrivateGroup ? 'private_group' : 'public_group';
    const { data, error } = await supabase
      .from('conversations')
      .insert({ name: newGroupName.trim(), type, created_by: user.id })
      .select()
      .single();
    
    if (data) {
      await supabase.from('conversation_members').insert({
        conversation_id: data.id,
        user_id: user.id,
      });
      toast.success('Group created!');
      setNewGroupName('');
      setShowCreate(false);
      fetchConversations();
    }
  };

  const handlePin = async (convId: string, currentlyPinned: boolean) => {
    if (!user) return;
    await supabase
      .from('conversation_members')
      .update({ is_pinned: !currentlyPinned })
      .eq('conversation_id', convId)
      .eq('user_id', user.id);
    fetchConversations();
  };

  const handleJoinGroup = async (convId: string) => {
    if (!user) return;
    await supabase.from('conversation_members').insert({
      conversation_id: convId,
      user_id: user.id,
    });
    toast.success('Joined group!');
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
            const isMember = conversations.some(mc => mc.id === c.id && (mc.type === 'direct' || mc.type === 'private_group' || mc.is_pinned || mc.type === 'public_group'));
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 p-4 hover:bg-card/50 transition-colors cursor-pointer"
                onClick={() => {
                  const memberConv = conversations.find(mc => mc.id === c.id);
                  if (memberConv) {
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
                    {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
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
