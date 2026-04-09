import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PostCard from '@/components/PostCard';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { anonymous_name: string; avatar_url: string } | null;
  comment_count: number;
}

const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, user_id, content, created_at, profiles(anonymous_name, avatar_url)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      // Get comment counts
      const postIds = data.map(p => p.id);
      const { data: comments } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds)
        .eq('is_deleted', false);
      
      const countMap: Record<string, number> = {};
      comments?.forEach(c => { countMap[c.post_id] = (countMap[c.post_id] || 0) + 1; });
      
      // Get blocked users
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user?.id || '');
      
      const blockedIds = new Set(blocks?.map(b => b.blocked_id) || []);
      
      setPosts(
        data
          .filter(p => !blockedIds.has(p.user_id))
          .map(p => ({ ...p, profiles: p.profiles as any, comment_count: countMap[p.id] || 0 }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from('posts').insert({ content: content.trim(), user_id: user.id });
    if (error) {
      toast.error('Failed to post');
    } else {
      setContent('');
      fetchPosts();
    }
    setPosting(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-primary">BUP Connect</h1>
      </header>

      <div className="p-4 border-b border-border">
        <Textarea
          placeholder="What's on your mind? (anonymous)"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="bg-card border-border min-h-[80px] resize-none"
          maxLength={500}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-muted-foreground">{content.length}/500</span>
          <Button onClick={handlePost} disabled={!content.trim() || posting} size="sm">
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No posts yet. Be the first!</div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} onRefresh={fetchPosts} />
          ))
        )}
      </div>
    </div>
  );
};

export default FeedPage;
