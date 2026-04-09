import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Trash2, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import ReportDialog from '@/components/ReportDialog';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { anonymous_name: string } | null;
}

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ commentId?: string; userId?: string } | null>(null);

  const fetchPost = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(anonymous_name, avatar_url)')
      .eq('id', id)
      .single();
    setPost(data);
  };

  const fetchComments = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at, profiles(anonymous_name)')
      .eq('post_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    setComments((data as any) || []);
  };

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

  const handleComment = async () => {
    if (!newComment.trim() || !user || !id) return;
    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      post_id: id,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (!error) {
      setNewComment('');
      fetchComments();
    } else {
      toast.error('Failed to comment');
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
    fetchComments();
  };

  if (!post) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold">Post</h1>
      </header>

      <div className="p-4 border-b border-border">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground">
            {post.profiles?.anonymous_name?.charAt(0) || 'A'}
          </div>
          <div>
            <span className="text-sm font-medium">{post.profiles?.anonymous_name || 'Anonymous'}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <Textarea
          placeholder="Write a reply..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          className="bg-card border-border min-h-[60px] resize-none"
          maxLength={300}
        />
        <div className="flex justify-end mt-2">
          <Button onClick={handleComment} disabled={!newComment.trim() || submitting} size="sm">
            Reply
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {comments.map(c => (
          <div key={c.id} className="p-4 animate-fade-in">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {c.profiles?.anonymous_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.profiles?.anonymous_name || 'Anonymous'}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-0.5">{c.content}</p>
                <div className="flex items-center gap-3 mt-1">
                  {user?.id === c.user_id && (
                    <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {user?.id !== c.user_id && (
                    <button onClick={() => setReportTarget({ commentId: c.id, userId: c.user_id })} className="text-xs text-muted-foreground hover:text-warning">
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No replies yet</div>
        )}
      </div>

      {reportTarget && (
        <ReportDialog
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          reportedCommentId={reportTarget.commentId}
          reportedUserId={reportTarget.userId}
        />
      )}
    </div>
  );
};

export default PostDetailPage;
