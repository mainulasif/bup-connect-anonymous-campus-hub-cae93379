import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Trash2, Flag, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import ReportDialog from '@/components/ReportDialog';
import { QUICK_REACTIONS } from '@/lib/gifts';
import { getAvatar } from '@/lib/avatars';

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: { anonymous_name: string; avatar_url: string; avatar_id?: number } | null;
    comment_count: number;
    reaction_counts?: Record<string, number>;
    viewer_reactions?: string[];
  };
  onRefresh: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onRefresh }) => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showReport, setShowReport] = useState(false);
  const isOwner = user?.id === post.user_id;

  const openProfile = () => {
    navigate(user?.id === post.user_id ? '/profile' : `/user/${post.user_id}`);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('posts').update({ is_deleted: true }).eq('id', post.id);
    if (!error) { toast.success('Post deleted'); onRefresh(); }
  };

  const handleBlock = async () => {
    if (!user) return;
    await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: post.user_id });
    toast.success('User blocked');
    onRefresh();
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    const hasReacted = post.viewer_reactions?.includes(emoji);
    const query = supabase.from('reactions');
    const { error } = hasReacted
      ? await query.delete().eq('post_id', post.id).eq('user_id', user.id).eq('emoji', emoji)
      : await query.insert({ post_id: post.id, user_id: user.id, emoji });
    if (error) { toast.error('Failed to update reaction'); return; }
    onRefresh();
  };

  const avatarId = post.profiles?.avatar_id || 1;
  const avatarEmoji = getAvatar(avatarId).emoji;

  return (
    <>
      <div className="p-4 animate-fade-in">
        <div className="flex gap-3">
          <button onClick={openProfile} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-lg shrink-0">
            {avatarEmoji}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button onClick={openProfile} className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                {post.profiles?.anonymous_name || 'Anonymous'}
              </button>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">{post.content}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_REACTIONS.map(emoji => {
                const count = post.reaction_counts?.[emoji] || 0;
                const active = post.viewer_reactions?.includes(emoji);
                return (
                  <button key={emoji} onClick={() => handleReaction(emoji)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
                    <span>{emoji}</span><span>{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <button onClick={() => navigate(`/post/${post.id}`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-4 h-4" />{post.comment_count}
              </button>
              {(isOwner || isAdmin) && (
                <button onClick={handleDelete} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {!isOwner && (
                <>
                  <button onClick={() => setShowReport(true)} className="text-xs text-muted-foreground hover:text-yellow-400 transition-colors">
                    <Flag className="w-4 h-4" />
                  </button>
                  <button onClick={handleBlock} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <Ban className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ReportDialog open={showReport} onClose={() => setShowReport(false)} reportedPostId={post.id} reportedUserId={post.user_id} />
    </>
  );
};

export default PostCard;
