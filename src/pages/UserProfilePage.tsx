import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Flower2, Gift, Heart, Diamond } from 'lucide-react';
import GiftDialog from '@/components/GiftDialog';
import { Button } from '@/components/ui/button';

interface UserProfile {
  user_id: string;
  anonymous_name: string;
  bio: string;
  points: number;
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

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('user_id', userId).single().then(({ data }) => {
      if (data) setProfile(data as any);
    });
  }, [userId]);

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const gifts = [
    { name: 'Black Orchid', count: profile.gift_black_orchid, icon: <Flower2 className="w-6 h-6" />, color: 'text-foreground' },
    { name: 'Plushie', count: profile.gift_plushie, icon: <Gift className="w-6 h-6" />, color: 'text-gift-plushie' },
    { name: 'Heart', count: profile.gift_heart, icon: <Heart className="w-6 h-6" />, color: 'text-gift-heart' },
    { name: 'Diamond', count: profile.gift_diamond, icon: <Diamond className="w-6 h-6" />, color: 'text-gift-diamond' },
  ];

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
          <h2 className="text-xl font-bold">{profile.anonymous_name}</h2>
        </div>

        <div className="bg-card rounded-lg p-4 text-center border border-border">
          <p className="text-xs text-muted-foreground uppercase">Points</p>
          <p className="text-3xl font-bold text-primary">{profile.points.toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {gifts.map(g => (
            <div key={g.name} className="bg-card rounded-lg p-3 text-center border border-border">
              <div className={`flex justify-center mb-1 ${g.color}`}>{g.icon}</div>
              <p className="text-lg font-bold">{g.count}</p>
              <p className="text-[10px] text-muted-foreground">{g.name}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Bio</p>
          <p className="text-sm">{profile.bio || 'No bio yet'}</p>
        </div>

        {user?.id !== userId && (
          <Button onClick={() => setShowGift(true)} className="w-full">
            <Gift className="w-4 h-4 mr-1" /> Send Gift
          </Button>
        )}
      </div>

      <GiftDialog open={showGift} onClose={() => setShowGift(false)} receiverId={userId || ''} />
    </div>
  );
};

export default UserProfilePage;
