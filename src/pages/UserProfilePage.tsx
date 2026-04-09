import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import GiftDialog from '@/components/GiftDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PROFILE_GIFT_FIELDS } from '@/lib/gifts';

interface UserProfile {
  user_id: string;
  anonymous_name: string;
  bio: string | null;
  points: number;
  is_admin: boolean;
  gift_black_orchid: number;
  gift_plushie: number;
  gift_heart: number;
  gift_diamond: number;
}

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showGift, setShowGift] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('user_id', userId).single().then(({ data }) => {
      if (data) setProfile(data as any);
    });
  }, [userId]);

  useEffect(() => {
    if (!user || !userId || user.id === userId) return;

    supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .maybeSingle()
      .then(({ data }) => setIsBlocked(!!data));
  }, [user, userId]);

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const handleMessage = async () => {
    if (!userId) return;

    setActionLoading(true);
    const { data, error } = await supabase.rpc('create_direct_conversation', { other_user_id: userId });
    setActionLoading(false);

    if (error || !data) {
      toast.error('Failed to open direct message');
      return;
    }

    navigate(`/chat/${data}`);
  };

  const handleBlockToggle = async () => {
    if (!user || !userId) return;

    setActionLoading(true);
    const request = isBlocked
      ? supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', userId)
      : supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId });

    const { error } = await request;
    setActionLoading(false);

    if (error) {
      toast.error(`Failed to ${isBlocked ? 'unblock' : 'block'} user`);
      return;
    }

    setIsBlocked(!isBlocked);
    toast.success(isBlocked ? 'User unblocked' : 'User blocked');
  };

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">{profile.anonymous_name}</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-secondary-foreground">
            {profile.anonymous_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{profile.anonymous_name}</h2>
            {profile.is_admin && <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>}
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 text-center border border-border">
          <p className="text-xs text-muted-foreground uppercase">Points</p>
          <p className="text-3xl font-bold text-primary">{profile.points.toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {PROFILE_GIFT_FIELDS.map(gift => (
            <div key={gift.name} className="bg-card rounded-lg p-3 text-center border border-border">
              <div className="flex justify-center mb-1 text-2xl leading-none">{gift.emoji}</div>
              <p className="text-lg font-bold">{profile[gift.key].toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{gift.name}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Bio</p>
          <p className="text-sm">{profile.bio || 'No bio yet'}</p>
        </div>

        {user?.id !== userId && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button onClick={handleMessage} disabled={actionLoading} className="w-full">
              Message
            </Button>
            <Button onClick={() => setShowGift(true)} variant="secondary" className="w-full">
              Send Gift
            </Button>
            <Button onClick={handleBlockToggle} variant="outline" disabled={actionLoading} className="w-full">
              {isBlocked ? 'Unblock' : 'Block'}
            </Button>
          </div>
        )}
      </div>

      <GiftDialog open={showGift} onClose={() => setShowGift(false)} receiverId={userId || ''} />
    </div>
  );
};

export default UserProfilePage;
