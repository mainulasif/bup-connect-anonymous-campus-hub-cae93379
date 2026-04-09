import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getAvatar } from '@/lib/avatars';

type Tab = 'posts' | 'users' | 'groups';

const SearchPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('posts');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const doSearch = async () => {
    if (!query.trim()) { setResults([]); return; }
    const q = `%${query.trim()}%`;

    if (tab === 'posts') {
      const { data } = await supabase.from('posts').select('id, content, created_at, user_id').eq('is_deleted', false).ilike('content', q).order('created_at', { ascending: false }).limit(20);
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = userIds.length ? await supabase.from('profiles').select('user_id, anonymous_name').in('user_id', userIds) : { data: [] as any[] };
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.anonymous_name]));
      setResults((data || []).map(p => ({ ...p, anonymous_name: nameMap.get(p.user_id) || 'Anonymous' })));
    } else if (tab === 'users') {
      const { data } = await supabase.from('profiles').select('user_id, anonymous_name, username, avatar_id, points, is_online').or(`anonymous_name.ilike.${q},username.ilike.${q}`).limit(20);
      setResults(data || []);
    } else {
      // Only search discoverable groups
      const { data } = await supabase.from('conversations').select('id, name, type').in('type', ['public_group']).ilike('name', q).limit(20);
      setResults(data || []);
    }
  };

  useEffect(() => {
    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [query, tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'users', label: 'Users' },
    { key: 'groups', label: 'Groups' },
  ];

  return (
    <div className="max-w-lg mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className="pl-9 bg-card border-border" autoFocus />
        </div>
      </header>

      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium ${tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border">
        {results.length === 0 && query && <div className="p-8 text-center text-muted-foreground text-sm">No results</div>}

        {tab === 'posts' && results.map((p: any) => (
          <button key={p.id} onClick={() => navigate(`/post/${p.id}`)} className="w-full text-left p-4 hover:bg-card/50">
            <p className="text-xs text-muted-foreground">{p.anonymous_name}</p>
            <p className="text-sm mt-1 line-clamp-2">{p.content}</p>
          </button>
        ))}

        {tab === 'users' && results.map((u: any) => (
          <button key={u.user_id} onClick={() => navigate(`/user/${u.user_id}`)} className="w-full text-left p-4 hover:bg-card/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">{getAvatar(u.avatar_id || 1).emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{u.anonymous_name}</p>
                <span className={`w-1.5 h-1.5 rounded-full ${u.is_online ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
              </div>
              <p className="text-xs text-muted-foreground">@{u.username} · {u.points.toLocaleString()} pts</p>
            </div>
          </button>
        ))}

        {tab === 'groups' && results.map((g: any) => (
          <button key={g.id} onClick={() => navigate(`/chat/${g.id}`)} className="w-full text-left p-4 hover:bg-card/50">
            <p className="text-sm font-medium">{g.name}</p>
            <p className="text-xs text-muted-foreground">{g.type === 'public_group' ? 'Public group' : 'Private group'}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;
