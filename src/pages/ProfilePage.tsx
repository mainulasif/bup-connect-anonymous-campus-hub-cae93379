import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Settings, Shield, Bell, Search, User, UserRound, Lock, Ban as BanIcon, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { PROFILE_GIFT_FIELDS } from '@/lib/gifts';
import { AVATARS, getAvatar } from '@/lib/avatars';
import { getUserBadges } from '@/lib/badges';
import BadgeIcon from '@/components/BadgeIcon';
import AvatarWithAccessories from '@/components/AvatarWithAccessories';
import AvatarImg from '@/components/AvatarImg';
import { GENDER_OPTIONS } from '@/lib/constants';

interface BlockedUser { blocked_id: string; anonymous_name: string; }
interface OwnedColor { color_id: string; css_class: string; name: string; }

const GenderIcon: React.FC<{ value: string }> = ({ value }) => {
  if (value === 'male') return <User className="w-4 h-4" />;
  if (value === 'female') return <UserRound className="w-4 h-4" />;
  return <span className="text-xs text-muted-foreground">—</span>;
};

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
  const [userItems, setUserItems] = useState<any[]>([]);
  const [equippedItems, setEquippedItems] = useState<any[]>([]);
  const [ownedColors, setOwnedColors] = useState<OwnedColor[]>([]);

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

  const fetchUserItems = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_items').select('*, shop_items(*)').eq('user_id', user.id);
    setUserItems(data || []);
    setEquippedItems((data || []).filter((i: any) => i.is_equipped).map((i: any) => ({
      category: i.shop_items?.category, icon_url: i.shop_items?.icon_url, name: i.shop_items?.name,
    })));
  };

  const fetchOwnedColors = async () => {
    if (!user) return;
    const { data: purchased } = await supabase.from('purchased_bubble_colors').select('color_id').eq('user_id', user.id);
    if (!purchased?.length) { setOwnedColors([]); return; }
    const colorIds = purchased.map(p => p.color_id);
    const { data: colors } = await supabase.from('bubble_colors').select('id, name, css_class').in('id', colorIds);
    setOwnedColors((colors || []).map(c => ({ color_id: c.id, css_class: c.css_class, name: c.name })));
  };

  useEffect(() => { fetchBlockedUsers(); fetchUserItems(); fetchOwnedColors(); }, [user]);

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
      anonymous_name: name.trim() || 'Anonymous', username: trimmedUsername,
      bio: bio.trim(), age: age ? parseInt(age) : null, gender, avatar_id: avatarId,
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

  const handleEquipToggle = async (itemId: string, category: string, currentlyEquipped: boolean) => {
    if (!user) return;
    if (!currentlyEquipped) {
      const sameCategory = userItems.filter(i => i.shop_items?.category === category && i.is_equipped);
      for (const item of sameCategory) {
        await supabase.from('user_items').update({ is_equipped: false }).eq('id', item.id);
      }
    }
    await supabase.from('user_items').update({ is_equipped: !currentlyEquipped }).eq('id', itemId);
    fetchUserItems();
    toast.success(currentlyEquipped ? 'Unequipped' : 'Equipped!');
  };

  const handleSwitchBubbleColor = async (cssClass: string) => {
    if (!user) return;
    await supabase.from('profiles').update({ bubble_color: cssClass }).eq('user_id', user.id);
    toast.success('Bubble color switched!');
    refreshProfile();
  };

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const badges = getUserBadges(profile, isFounder);
  const BUBBLE_PREVIEW: Record<string, string> = {
    'bg-primary': 'hsl(var(--primary))', 'bg-blue-600': '#2563eb', 'bg-orange-500': '#f97316',
    'bg-emerald-500': '#10b981', 'bg-purple-600': '#9333ea', 'bg-pink-400': '#f472b6', 'bg-cyan-400': '#22d3ee',
  };

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
        <div className="flex flex-col items-center gap-3">
          <button onClick={() => editing && setShowAvatarPicker(!showAvatarPicker)}>
            <AvatarWithAccessories avatarId={avatarId} equippedItems={equippedItems} size="lg" />
          </button>
          {showAvatarPicker && editing && (
            <div className="grid grid-cols-5 gap-2 p-3 bg-card rounded-lg border border-border max-w-[300px]">
              {AVATARS.map(a => (
                <button key={a.id} onClick={() => { setAvatarId(a.id); setShowAvatarPicker(false); }}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${avatarId === a.id ? 'bg-primary/20 border-2 border-primary' : 'bg-background border border-border hover:bg-muted'}`}>
                  <img src={a.src} alt={a.label} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          {editing ? (
            <div className="space-y-2 w-full max-w-[250px]">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display name" className="bg-card border-border text-center" maxLength={30} />
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="bg-card border-border text-center text-xs" maxLength={30} />
            </div>
          ) : (
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
          )}
        </div>

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
          <div className="bg-card rounded-lg p-3 text-center border border-border flex flex-col items-center justify-center">
            <p className="text-xs text-muted-foreground">Gender</p>
            {editing ? (
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-7 text-xs bg-background border border-border rounded text-foreground">
                {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            ) : <GenderIcon value={profile.gender || 'unspecified'} />}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${profile.is_online ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
          <span className="text-xs text-muted-foreground">{profile.is_online ? 'Online' : 'Offline'}</span>
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

        {userItems.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">My Items</h3>
            <div className="grid grid-cols-3 gap-2">
              {userItems.map((item: any) => (
                <button key={item.id} onClick={() => handleEquipToggle(item.id, item.shop_items?.category, item.is_equipped)}
                  className={`rounded-xl border p-3 text-center transition-colors ${item.is_equipped ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                  <img src={item.shop_items?.icon_url} alt={item.shop_items?.name} className="w-10 h-10 mx-auto" />
                  <p className="text-[10px] mt-1 truncate">{item.shop_items?.name}</p>
                  <p className="text-[9px] text-muted-foreground">{item.is_equipped ? 'Equipped' : 'Tap to equip'}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {ownedColors.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1"><Palette className="w-4 h-4" /> My Bubble Colors</h3>
            <div className="flex flex-wrap gap-2">
              {ownedColors.map(c => {
                const isActive = (profile as any)?.bubble_color === c.css_class;
                const bg = BUBBLE_PREVIEW[c.css_class] || '#6366f1';
                return (
                  <button key={c.color_id} onClick={() => handleSwitchBubbleColor(c.css_class)}
                    className={`rounded-lg px-3 py-2 text-xs border transition-colors ${isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}>
                    <div className="w-6 h-6 rounded-full mx-auto mb-1" style={{ background: c.css_class.includes('gradient') ? 'linear-gradient(to right, #8b5cf6, #22d3ee)' : bg }} />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

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
              <Button onClick={() => navigate('/search')} variant="outline" className="flex-1"><Search className="w-4 h-4 mr-1" /> Search</Button>
            </>
          )}
        </div>

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

        {(profile.is_banned || profile.is_jailed) && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 space-y-2">
            {profile.is_banned && (
              <div className="flex items-start gap-2">
                <BanIcon className="w-4 h-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">You are banned</p>
                  <p className="text-xs text-muted-foreground">{profile.ban_reason}</p>
                  {profile.ban_expires_at && <p className="text-xs text-muted-foreground">Expires: {new Date(profile.ban_expires_at).toLocaleString()}</p>}
                </div>
              </div>
            )}
            {profile.is_jailed && (
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">You are in Jail</p>
                  {profile.jail_expires_at && <p className="text-xs text-muted-foreground">Expires: {new Date(profile.jail_expires_at).toLocaleString()}</p>}
                </div>
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
