import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Trash2, Flag, Ban, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import ReportDialog from '@/components/ReportDialog';
import { QUICK_REACTIONS } from '@/lib/gifts';
import AvatarImg from '@/components/AvatarImg';
import { BAN_DURATIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
  const { user, isAdmin, isFounder } = useAuth();
  const navigate = useNavigate();
  const [showReport, setShowReport] = useState(false);
  const [punishDialog, setPunishDialog] = useState(false);
  const [punishAction, setPunishAction] = useState<'ban' | 'jail'>('jail');
  const [banDuration, setBanDuration] = useState(1440);
  const [banReason, setBanReason] = useState('');
  const isOwner = user?.id === post.user_id;
  const canPunish = isAdmin || isFounder;

  const openProfile = () => {
    navigate(user?.id === post.user_id ? '/profile' : `/user/${post.user_id}`);
  };

  const handleDelete = async () => {
    if (!user) return;
    const { error } = await supabase.from('posts').update({ is_deleted: true }).eq('id', post.id);
    if (error) { toast.error('Failed to delete post'); return; }
    toast.success('Post deleted');
    onRefresh();
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
    if (hasReacted) {
      const { error } = await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', user.id).eq('emoji', emoji);
      if (error) { toast.error('Failed to update reaction'); return; }
    } else {
      const { error } = await supabase.from('reactions').insert({ post_id: post.id, user_id: user.id, emoji });
      if (error) { toast.error('Failed to update reaction'); return; }
    }
    onRefresh();
  };

  const handlePunish = async () => {
    if (!user || !banReason.trim()) { toast.error('Reason is required'); return; }
    const duration = banDuration === 0 ? null : banDuration;
    const { error } = await supabase.rpc('admin_punish_user', {
      _admin_id: user.id, _target_user_id: post.user_id, _action: punishAction,
      _duration_minutes: duration, _reason: banReason,
    });
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success(`User ${punishAction === 'ban' ? 'banned' : 'sent to jail'}`);
    setPunishDialog(false);
    setBanReason('');
  };

  const avatarId = post.profiles?.avatar_id || 1;

  return (
    <>
      <div className="p-4 animate-fade-in">
        <div className="flex gap-3">
          <button onClick={openProfile} className="shrink-0">
            <AvatarImg avatarId={avatarId} size="md" />
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
              {canPunish && !isOwner && (
                <button onClick={() => setPunishDialog(true)} className="text-xs text-muted-foreground hover:text-orange-400 transition-colors" title="Ban / Send to Jail">
                  <Lock className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <ReportDialog open={showReport} onClose={() => setShowReport(false)} reportedPostId={post.id} reportedUserId={post.user_id} />
      
      {punishDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold">Punish User</h3>
            <p className="text-sm text-muted-foreground">{post.profiles?.anonymous_name || 'Anonymous'}</p>
            <div className="flex gap-2">
              <Button size="sm" variant={punishAction === 'ban' ? 'default' : 'ghost'} onClick={() => setPunishAction('ban')}>
                <Ban className="w-3 h-3 mr-1" /> Ban
              </Button>
              <Button size="sm" variant={punishAction === 'jail' ? 'default' : 'ghost'} onClick={() => setPunishAction('jail')}>
                <Lock className="w-3 h-3 mr-1" /> Jail
              </Button>
            </div>
            <select value={banDuration} onChange={e => setBanDuration(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-lg p-2 text-sm text-foreground">
              {BAN_DURATIONS.map(d => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
            </select>
            <Textarea placeholder="Reason..." value={banReason} onChange={e => setBanReason(e.target.value)} className="bg-background border-border min-h-[60px]" />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setPunishDialog(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handlePunish}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCard;
