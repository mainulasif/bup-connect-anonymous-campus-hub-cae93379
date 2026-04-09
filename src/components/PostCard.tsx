import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Trash2, Flag, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import ReportDialog from '@/components/ReportDialog';

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: { anonymous_name: string; avatar_url: string } | null;
    comment_count: number;
  };
  onRefresh: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onRefresh }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showReport, setShowReport] = useState(false);
  const isOwner = user?.id === post.user_id;

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

  const avatar = post.profiles?.anonymous_name?.charAt(0)?.toUpperCase() || 'A';

  return (
    <>
      <div className="p-4 animate-fade-in">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground shrink-0">
            {avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {post.profiles?.anonymous_name || 'Anonymous'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">{post.content}</p>
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => navigate(`/post/${post.id}`)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {post.comment_count}
              </button>
              {isOwner && (
                <button onClick={handleDelete} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {!isOwner && (
                <>
                  <button onClick={() => setShowReport(true)} className="text-xs text-muted-foreground hover:text-warning transition-colors">
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

      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        reportedPostId={post.id}
        reportedUserId={post.user_id}
      />
    </>
  );
};

export default PostCard;
