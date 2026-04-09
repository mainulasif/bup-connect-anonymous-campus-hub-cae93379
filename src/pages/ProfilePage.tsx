import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { PROFILE_GIFT_FIELDS } from '@/lib/gifts';

interface BlockedUser {
  blocked_id: string;
  anonymous_name: string;
}

const ProfilePage: React.FC = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  useEffect(() => {
    if (profile) {
      setName(profile.anonymous_name);
      setBio(profile.bio || '');
    }
  }, [profile]);

  const fetchBlockedUsers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);

    if (error) {
      toast.error('Failed to load blocked users');
      return;
    }

    const blockedIds = (data || []).map(item => item.blocked_id);
    if (!blockedIds.length) {
      setBlockedUsers([]);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, anonymous_name')
      .in('user_id', blockedIds);

    const profileMap = new Map((profiles || []).map(item => [item.user_id, item.anonymous_name]));
    setBlockedUsers(blockedIds.map(blockedId => ({ blocked_id: blockedId, anonymous_name: profileMap.get(blockedId) || 'Anonymous' })));
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [user]);

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

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);

    if (error) {
      toast.error('Failed to unblock user');
      return;
    }

    toast.success('User unblocked');
    fetchBlockedUsers();
  };

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

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
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{profile.anonymous_name}</h2>
              {isAdmin && <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>}
            </div>
          )}
        </div>

        {/* Points */}
        <div className="bg-card rounded-lg p-4 text-center border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Points</p>
          <p className="text-3xl font-bold text-primary">{profile.points.toLocaleString()}</p>
        </div>

        {/* Gift boxes - always show 4 */}
        <div className="grid grid-cols-4 gap-2">
          {PROFILE_GIFT_FIELDS.map(gift => (
            <div key={gift.name} className="bg-card rounded-lg p-3 text-center border border-border">
              <div className="flex justify-center mb-1 text-2xl leading-none">{gift.emoji}</div>
              <p className="text-lg font-bold">{profile[gift.key].toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{gift.name}</p>
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
              <Button onClick={() => navigate('/inbox')} variant="outline" className="flex-1">Open Inbox</Button>
            </>
          )}
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Blocked users</h3>
            <p className="text-xs text-muted-foreground">Manage who you have blocked.</p>
          </div>

          <div className="space-y-2">
            {blockedUsers.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No blocked users.</div>
            ) : (
              blockedUsers.map(blockedUser => (
                <div key={blockedUser.blocked_id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <button onClick={() => navigate(`/user/${blockedUser.blocked_id}`)} className="text-sm font-medium hover:text-primary transition-colors">
                    {blockedUser.anonymous_name}
                  </button>
                  <Button variant="outline" size="sm" onClick={() => handleUnblock(blockedUser.blocked_id)}>
                    Unblock
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
