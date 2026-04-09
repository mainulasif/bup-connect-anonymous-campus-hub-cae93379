export interface Badge {
  key: string;
  label: string;
  emoji: string;
  color: string; // tailwind class
}

export const ALL_BADGES: Badge[] = [
  { key: 'founder', label: 'Founder', emoji: '👑', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { key: 'admin', label: 'Admin', emoji: '🛡️', color: 'bg-primary/20 text-primary border-primary/30' },
  { key: 'creator', label: 'Creator', emoji: '⭐', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { key: 'moderator', label: 'Mod', emoji: '🔧', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { key: 'premium', label: 'Premium', emoji: '💎', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { key: 'jailed', label: 'Jailed', emoji: '⛓️', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { key: 'muted', label: 'Muted', emoji: '🔇', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { key: 'banned', label: 'Banned', emoji: '🚫', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

export const FOUNDER_EMAIL = '2252421086@student.bup.edu.bd';

export function getUserBadges(profile: {
  is_admin?: boolean;
  is_banned?: boolean;
  is_jailed?: boolean;
  is_muted?: boolean;
  is_premium?: boolean;
  ban_expires_at?: string | null;
}, isFounder: boolean, groupRole?: string): Badge[] {
  const badges: Badge[] = [];
  if (isFounder) badges.push(ALL_BADGES.find(b => b.key === 'founder')!);
  else if (profile.is_admin) badges.push(ALL_BADGES.find(b => b.key === 'admin')!);
  if (groupRole === 'creator') badges.push(ALL_BADGES.find(b => b.key === 'creator')!);
  if (groupRole === 'moderator') badges.push(ALL_BADGES.find(b => b.key === 'moderator')!);
  if (profile.is_premium) badges.push(ALL_BADGES.find(b => b.key === 'premium')!);
  if (profile.is_jailed) badges.push(ALL_BADGES.find(b => b.key === 'jailed')!);
  if (profile.is_muted) badges.push(ALL_BADGES.find(b => b.key === 'muted')!);
  if (profile.is_banned && profile.ban_expires_at) badges.push(ALL_BADGES.find(b => b.key === 'banned')!);
  return badges;
}
