import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Settings, Shield, Flower2, Heart, Diamond, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import GiftDialog from '@/components/GiftDialog';

const ProfilePage: React.FC = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [showGift, setShowGift] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.anonymous_name);
      setBio(profile.bio);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      anonymous_name: name.trim() || 'Anonymous',
      bio: bio.trim(),
    }).eq('user_id', user.id);
    
    if (!error) {
      toast.success('Profile updated');
      setEditing(false);
      refreshProfile();
    }
  };

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const gifts = [
    { name: 'Black Orchid', count: profile.gift_black_orchid, icon: <Flower2 className="w-6 h-6" />, color: 'text-foreground' },
    { name: 'Plushie', count: profile.gift_plushie, icon: <Gift className="w-6 h-6" />, color: 'text-gift-plushie' },
    { name: 'Heart', count: profile.gift_heart, icon: <Heart className="w-6 h-6" />, color: 'text-gift-heart' },
    { name: 'Diamond', count: profile.gift_diamond, icon: <Diamond className="w-6 h-6" />, color: 'text-gift-diamond' },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-bold">Profile</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <Shield className="w-5 h-5 text-primary" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-secondary-foreground">
            {profile.anonymous_name.charAt(0).toUpperCase()}
          </div>
          {editing ? (
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-card border-border text-center max-w-[200px]"
              maxLength={30}
            />
          ) : (
            <h2 className="text-xl font-bold">{profile.anonymous_name}</h2>
          )}
        </div>

        {/* Points */}
        <div className="bg-card rounded-lg p-4 text-center border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Points</p>
          <p className="text-3xl font-bold text-primary">{profile.points.toLocaleString()}</p>
        </div>

        {/* Gift boxes - always show 4 */}
        <div className="grid grid-cols-4 gap-2">
          {gifts.map(g => (
            <div key={g.name} className="bg-card rounded-lg p-3 text-center border border-border">
              <div className={`flex justify-center mb-1 ${g.color}`}>{g.icon}</div>
              <p className="text-lg font-bold">{g.count}</p>
              <p className="text-[10px] text-muted-foreground">{g.name}</p>
            </div>
          ))}
        </div>

        {/* Bio */}
        {editing ? (
          <Textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Write something about yourself..."
            className="bg-card border-border"
            maxLength={200}
          />
        ) : (
          <div className="bg-card rounded-lg p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Bio</p>
            <p className="text-sm">{profile.bio || 'No bio yet'}</p>
          </div>
        )}

        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={handleSave} className="flex-1">Save</Button>
              <Button variant="ghost" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)} variant="secondary" className="flex-1">
                <Settings className="w-4 h-4 mr-1" /> Edit Profile
              </Button>
              <Button onClick={() => setShowGift(true)} variant="outline" className="flex-1">
                <Gift className="w-4 h-4 mr-1" /> Send Gift
              </Button>
            </>
          )}
        </div>
      </div>

      <GiftDialog open={showGift} onClose={() => setShowGift(false)} receiverId={user?.id || ''} />
    </div>
  );
};

export default ProfilePage;
