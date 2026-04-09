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
import { QUICK_REACTIONS } from '@/lib/gifts';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  anonymous_name: string;
}

interface PostRecord {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  anonymous_name: string;
}

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostRecord | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [viewerReactions, setViewerReactions] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ commentId?: string; userId?: string } | null>(null);

  const fetchPost = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('posts')
      .select('id, user_id, content, created_at')
      .eq('id', id)
      .single();

    if (!data) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, anonymous_name')
      .eq('user_id', data.user_id)
      .single();

    setPost({ ...data, anonymous_name: profile?.anonymous_name || 'Anonymous' });
  };

  const fetchComments = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at')
      .eq('post_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    const commentRows = data || [];
    const userIds = [...new Set(commentRows.map(comment => comment.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('user_id, anonymous_name').in('user_id', userIds)
      : { data: [] as { user_id: string; anonymous_name: string }[] };

    const nameMap = new Map((profiles || []).map(profile => [profile.user_id, profile.anonymous_name]));
    setComments(commentRows.map(comment => ({ ...comment, anonymous_name: nameMap.get(comment.user_id) || 'Anonymous' })));
  };

  const fetchReactions = async () => {
    if (!id) return;

    const { data } = await supabase
      .from('reactions')
      .select('emoji, user_id')
      .eq('post_id', id);

    const nextCounts: Record<string, number> = {};
    const nextViewerReactions: string[] = [];

    data?.forEach(reaction => {
      nextCounts[reaction.emoji] = (nextCounts[reaction.emoji] || 0) + 1;

      if (reaction.user_id === user?.id) {
        nextViewerReactions.push(reaction.emoji);
      }
    });

    setReactionCounts(nextCounts);
    setViewerReactions(nextViewerReactions);
  };

  useEffect(() => {
    fetchPost();
    fetchComments();
    fetchReactions();
  }, [id, user?.id]);

  const openProfile = (profileUserId: string) => {
    navigate(user?.id === profileUserId ? '/profile' : `/user/${profileUserId}`);
  };

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

  const handleReaction = async (emoji: string) => {
    if (!user || !id) return;

    const hasReacted = viewerReactions.includes(emoji);
    const query = supabase.from('reactions');
    const { error } = hasReacted
      ? await query.delete().eq('post_id', id).eq('user_id', user.id).eq('emoji', emoji)
      : await query.insert({ post_id: id, user_id: user.id, emoji });

    if (error) {
      toast.error('Failed to update reaction');
      return;
    }

    fetchReactions();
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
          <button onClick={() => openProfile(post.user_id)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground">
            {post.anonymous_name.charAt(0) || 'A'}
          </button>
          <div>
            <button onClick={() => openProfile(post.user_id)} className="text-sm font-medium hover:text-primary transition-colors">{post.anonymous_name}</button>
            <span className="text-xs text-muted-foreground ml-2">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{post.content}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_REACTIONS.map(emoji => {
                const active = viewerReactions.includes(emoji);

                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{reactionCounts[emoji] || 0}</span>
                  </button>
                );
              })}
            </div>
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
              <button onClick={() => openProfile(c.user_id)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {c.anonymous_name.charAt(0) || 'A'}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => openProfile(c.user_id)} className="text-sm font-medium hover:text-primary transition-colors">{c.anonymous_name}</button>
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
