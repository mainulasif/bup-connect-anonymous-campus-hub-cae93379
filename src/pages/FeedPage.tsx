import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PostCard from '@/components/PostCard';
import { containsProfanity, censorText } from '@/lib/profanity';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { anonymous_name: string; avatar_url: string; avatar_id?: number } | null;
  comment_count: number;
  reaction_counts: Record<string, number>;
  viewer_reactions: string[];
}

const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('id, user_id, content, created_at').eq('is_deleted', false).order('created_at', { ascending: false }).limit(50);
    
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('user_id, anonymous_name, avatar_url, avatar_id').in('user_id', userIds);
      const profileMap: Record<string, { anonymous_name: string; avatar_url: string; avatar_id?: number }> = {};
      profilesData?.forEach(p => { profileMap[p.user_id] = { anonymous_name: p.anonymous_name, avatar_url: p.avatar_url || '', avatar_id: p.avatar_id }; });

      const postIds = data.map(p => p.id);
      const { data: comments } = await supabase.from('comments').select('post_id').in('post_id', postIds).eq('is_deleted', false);
      const countMap: Record<string, number> = {};
      comments?.forEach(c => { countMap[c.post_id] = (countMap[c.post_id] || 0) + 1; });

      const { data: reactions } = await supabase.from('reactions').select('post_id, emoji, user_id').in('post_id', postIds);
      const reactionCountMap: Record<string, Record<string, number>> = {};
      const viewerReactionMap: Record<string, string[]> = {};
      reactions?.forEach(r => {
        reactionCountMap[r.post_id] ??= {};
        reactionCountMap[r.post_id][r.emoji] = (reactionCountMap[r.post_id][r.emoji] || 0) + 1;
        if (r.user_id === user?.id) { viewerReactionMap[r.post_id] ??= []; viewerReactionMap[r.post_id].push(r.emoji); }
      });
      
      const { data: blocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user?.id || '');
      const blockedIds = new Set(blocks?.map(b => b.blocked_id) || []);
      
      setPosts(data.filter(p => !blockedIds.has(p.user_id)).map(p => ({
        ...p,
        profiles: profileMap[p.user_id] || null,
        comment_count: countMap[p.id] || 0,
        reaction_counts: reactionCountMap[p.id] || {},
        viewer_reactions: viewerReactionMap[p.id] || [],
      })));
    } else { setPosts([]); }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase.channel('posts-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchPosts()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    let text = content.trim();
    if (containsProfanity(text)) { text = censorText(text); toast.info('Profanity was filtered'); }
    setPosting(true);
    const { error } = await supabase.from('posts').insert({ content: text, user_id: user.id });
    if (error) { toast.error('Failed to post'); } else { setContent(''); fetchPosts(); }
    setPosting(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-primary">BUP Connect</h1>
      </header>
      <div className="p-4 border-b border-border">
        <Textarea placeholder="What's on your mind? (anonymous)" value={content} onChange={e => setContent(e.target.value)} className="bg-card border-border min-h-[80px] resize-none" maxLength={500} />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-muted-foreground">{content.length}/500</span>
          <Button onClick={handlePost} disabled={!content.trim() || posting} size="sm">{posting ? 'Posting...' : 'Post'}</Button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div>
          : posts.length === 0 ? <div className="p-8 text-center text-muted-foreground">No posts yet. Be the first!</div>
          : posts.map(post => <PostCard key={post.id} post={post} onRefresh={fetchPosts} />)}
      </div>
    </div>
  );
};

export default FeedPage;
