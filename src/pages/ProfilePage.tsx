import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Settings, Shield, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { PROFILE_GIFT_FIELDS } from '@/lib/gifts';
import { AVATARS, getAvatar } from '@/lib/avatars';
import { getUserBadges } from '@/lib/badges';
import { GENDER_OPTIONS } from '@/lib/constants';

interface BlockedUser {
  blocked_id: string;
  anonymous_name: string;
}

const ProfilePage: React.FC = () => {
  const { user, profile, isAdmin, isFounder, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('unspecified');
  const [avatarId, setAvatarId] = useState(1);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (profile) {
      setName(profile.anonymous_name);
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAge(profile.age?.toString() || '');
      setGender(profile.gender || 'unspecified');
      setAvatarId(profile.avatar_id || 1);
    }
  }, [profile]);

  const fetchBlockedUsers = async () => {
    if (!user) return;
    const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id);
    const blockedIds = (data || []).map(item => item.blocked_id);
    if (!blockedIds.length) { setBlockedUsers([]); return; }
    const { data: profiles } = await supabase.from('profiles').select('user_id, anonymous_name').in('user_id', blockedIds);
    const profileMap = new Map((profiles || []).map(item => [item.user_id, item.anonymous_name]));
    setBlockedUsers(blockedIds.map(id => ({ blocked_id: id, anonymous_name: profileMap.get(id) || 'Anonymous' })));
  };

  useEffect(() => { fetchBlockedUsers(); }, [user]);
  
  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false).then(({ count }) => setUnreadNotifs(count || 0));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) { toast.error('Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) { toast.error('Username can only contain letters, numbers, underscores'); return; }

    const { error } = await supabase.from('profiles').update({
      anonymous_name: name.trim() || 'Anonymous',
      username: trimmedUsername,
      bio: bio.trim(),
      age: age ? parseInt(age) : null,
      gender,
      avatar_id: avatarId,
    }).eq('user_id', user.id);
    
    if (error) {
      if (error.message.includes('profiles_username_unique')) toast.error('Username already taken');
      else toast.error('Failed to save');
      return;
    }
    toast.success('Profile updated');
    setEditing(false);
    refreshProfile();
  };

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId);
    if (error) { toast.error('Failed to unblock'); return; }
    toast.success('User unblocked');
    fetchBlockedUsers();
  };

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const avatar = getAvatar(profile.avatar_id || 1);
  const badges = getUserBadges(profile, isFounder);
  const genderInfo = GENDER_OPTIONS.find(g => g.value === (profile.gender || 'unspecified'));

  return (
    <div className="max-w-lg mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-bold">Profile</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
            <Bell className="w-5 h-5" />
            {unreadNotifs > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">{unreadNotifs}</span>}
          </Button>
          {isAdmin && <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}><Shield className="w-5 h-5 text-primary" /></Button>}
          <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <button onClick={() => editing && setShowAvatarPicker(!showAvatarPicker)} className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-4xl">
            {avatar.emoji}
          </button>
          {showAvatarPicker && editing && (
            <div className="grid grid-cols-5 gap-2 p-3 bg-card rounded-lg border border-border max-w-[280px]">
              {AVATARS.map(a => (
                <button key={a.id} onClick={() => { setAvatarId(a.id); setShowAvatarPicker(false); }}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-colors ${avatarId === a.id ? 'bg-primary/20 border-2 border-primary' : 'bg-background border border-border hover:bg-muted'}`}>
                  {a.emoji}
                </button>
              ))}
            </div>
          )}
          {editing ? (
            <div className="space-y-2 w-full max-w-[250px]">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display name" className="bg-card border-border text-center" maxLength={30} />
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username (e.g. ShadowTiger_4821)" className="bg-card border-border text-center text-xs" maxLength={30} />
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-bold">{profile.anonymous_name}</h2>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
              <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                {badges.map(b => (
                  <span key={b.key} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${b.color}`}>{b.emoji} {b.label}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status & info */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-lg p-3 text-center border border-border">
            <p className="text-xs text-muted-foreground">Points</p>
            <p className="text-lg font-bold text-primary">{profile.points.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center border border-border">
            <p className="text-xs text-muted-foreground">Age</p>
            {editing ? <Input type="number" value={age} onChange={e => setAge(e.target.value)} className="h-7 text-center bg-background border-border text-sm" min={16} max={99} />
              : <p className="text-lg font-bold">{profile.age || '—'}</p>}
          </div>
          <div className="bg-card rounded-lg p-3 text-center border border-border">
            <p className="text-xs text-muted-foreground">Gender</p>
            {editing ? (
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-7 text-xs bg-background border border-border rounded text-foreground">
                {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.icon} {g.label}</option>)}
              </select>
            ) : <p className="text-lg">{genderInfo?.icon || '🤫'}</p>}
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${profile.is_online ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
          <span className="text-xs text-muted-foreground">{profile.is_online ? 'Online' : 'Offline'}</span>
        </div>

        {/* Gifts */}
        <div className="grid grid-cols-4 gap-2">
          {PROFILE_GIFT_FIELDS.map(gift => (
            <div key={gift.name} className="bg-card rounded-lg p-3 text-center border border-border">
              <div className="flex justify-center mb-1 text-2xl leading-none">{gift.emoji}</div>
              <p className="text-lg font-bold">{(profile as any)[gift.key]?.toLocaleString?.() ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">{gift.name}</p>
            </div>
          ))}
        </div>

        {/* Bio */}
        {editing ? (
          <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write something about yourself..." className="bg-card border-border" maxLength={200} />
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
              <Button onClick={() => setEditing(true)} variant="secondary" className="flex-1"><Settings className="w-4 h-4 mr-1" /> Edit Profile</Button>
              <Button onClick={() => navigate('/search')} variant="outline" className="flex-1">🔍 Search</Button>
            </>
          )}
        </div>

        {/* Blocked users */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Blocked users</h3>
          <div className="space-y-2">
            {blockedUsers.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No blocked users.</div>
            ) : blockedUsers.map(bu => (
              <div key={bu.blocked_id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <button onClick={() => navigate(`/user/${bu.blocked_id}`)} className="text-sm font-medium hover:text-primary transition-colors">{bu.anonymous_name}</button>
                <Button variant="outline" size="sm" onClick={() => handleUnblock(bu.blocked_id)}>Unblock</Button>
              </div>
            ))}
          </div>
        </section>

        {/* Ban / Jail status */}
        {(profile.is_banned || profile.is_jailed) && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 space-y-2">
            {profile.is_banned && (
              <div>
                <p className="text-sm font-medium text-destructive">🚫 You are banned</p>
                <p className="text-xs text-muted-foreground">{profile.ban_reason}</p>
                {profile.ban_expires_at && <p className="text-xs text-muted-foreground">Expires: {new Date(profile.ban_expires_at).toLocaleString()}</p>}
              </div>
            )}
            {profile.is_jailed && (
              <div>
                <p className="text-sm font-medium text-destructive">⛓️ You are in Jail</p>
                {profile.jail_expires_at && <p className="text-xs text-muted-foreground">Expires: {new Date(profile.jail_expires_at).toLocaleString()}</p>}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate('/appeal')}>Submit Appeal</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
