import React from 'react';
import { Crown, ShieldCheck, Star, Wrench, Gem, Lock, VolumeX, Ban } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown, ShieldCheck, Star, Wrench, Gem, Lock, VolumeX, Ban,
};

interface BadgeIconProps {
  name: string;
  className?: string;
}

const BadgeIcon: React.FC<BadgeIconProps> = ({ name, className = 'w-3 h-3' }) => {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={className} />;
};

export default BadgeIcon;
