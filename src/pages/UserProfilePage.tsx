import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import GiftDialog from '@/components/GiftDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PROFILE_GIFT_FIELDS } from '@/lib/gifts';
import { getUserBadges, FOUNDER_EMAIL } from '@/lib/badges';
import BadgeIcon from '@/components/BadgeIcon';
import AvatarImg from '@/components/AvatarImg';
import { User, UserRound } from 'lucide-react';

interface UserProfile {
  user_id: string;
  anonymous_name: string;
  username: string;
  bio: string | null;
  age: number | null;
  gender: string;
  avatar_id: number;
  points: number;
  is_admin: boolean;
  is_banned: boolean;
  is_jailed: boolean;
  is_muted: boolean;
  is_premium: boolean;
  is_online: boolean;
  ban_expires_at: string | null;
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
  const [equippedItems, setEquippedItems] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('user_id', userId).single().then(({ data }) => {
      if (data) setProfile(data as any);
    });
    supabase.from('user_items').select('*, shop_items(*)').eq('user_id', userId).eq('is_equipped', true).then(({ data }) => {
      setEquippedItems(data || []);
    });
  }, [userId]);

  useEffect(() => {
    if (!user || !userId || user.id === userId) return;
    supabase.from('blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', userId).maybeSingle().then(({ data }) => setIsBlocked(!!data));
  }, [user, userId]);

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const handleMessage = async () => {
    if (!userId) return;
    setActionLoading(true);
    const { data, error } = await supabase.rpc('create_direct_conversation', { other_user_id: userId });
    setActionLoading(false);
    if (error || !data) { toast.error('Failed to open DM'); return; }
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
    if (error) { toast.error(`Failed to ${isBlocked ? 'unblock' : 'block'}`); return; }
    setIsBlocked(!isBlocked);
    toast.success(isBlocked ? 'User unblocked' : 'User blocked');
  };

  const badges = getUserBadges(profile, false);
  const GenderIcon = profile.gender === 'male' ? User : profile.gender === 'female' ? UserRound : null;

  return (
    <div className="max-w-lg mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold truncate">{profile.anonymous_name}</h1>
        <span className={`ml-auto w-2 h-2 rounded-full ${profile.is_online ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <AvatarImg avatarId={profile.avatar_id || 1} size="lg" />
          {/* Equipped items */}
          {equippedItems.length > 0 && (
            <div className="flex gap-2">
              {equippedItems.map((item: any) => (
                <div key={item.id} className="flex flex-col items-center">
                  <img src={item.shop_items?.icon_url} alt={item.shop_items?.name} className="w-8 h-8" />
                  <span className="text-[9px] text-muted-foreground">{item.shop_items?.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="text-center">
            <h2 className="text-xl font-bold">{profile.anonymous_name}</h2>
            <p className="text-xs text-muted-foreground">@{profile.username}</p>
            <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
              {badges.map(b => (
                <span key={b.key} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-1 ${b.color}`}>
                  <BadgeIcon name={b.iconName} /> {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-lg p-3 text-center border border-border">
            <p className="text-xs text-muted-foreground">Points</p>
            <p className="text-lg font-bold text-primary">{profile.points.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center border border-border">
            <p className="text-xs text-muted-foreground">Age</p>
            <p className="text-lg font-bold">{profile.age || '—'}</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center border border-border flex flex-col items-center justify-center">
            <p className="text-xs text-muted-foreground">Gender</p>
            {GenderIcon ? <GenderIcon className="w-5 h-5" /> : <span className="text-sm">—</span>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {PROFILE_GIFT_FIELDS.map(gift => (
            <div key={gift.name} className="bg-card rounded-lg p-3 text-center border border-border">
              <div className="flex justify-center mb-1 text-2xl leading-none">{gift.emoji}</div>
              <p className="text-lg font-bold">{(profile as any)[gift.key]?.toLocaleString?.() ?? 0}</p>
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
            <Button onClick={handleMessage} disabled={actionLoading} className="w-full">Message</Button>
            <Button onClick={() => setShowGift(true)} variant="secondary" className="w-full">Send Gift</Button>
            <Button onClick={handleBlockToggle} variant="outline" disabled={actionLoading} className="w-full">{isBlocked ? 'Unblock' : 'Block'}</Button>
          </div>
        )}
      </div>

      <GiftDialog open={showGift} onClose={() => setShowGift(false)} receiverId={userId || ''} />
    </div>
  );
};

export default UserProfilePage;
