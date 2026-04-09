import React from 'react';
import { getAvatar } from '@/lib/avatars';

interface AvatarImgProps {
  avatarId: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-20 h-20',
};

const AvatarImg: React.FC<AvatarImgProps> = ({ avatarId, size = 'md', className = '' }) => {
  const avatar = getAvatar(avatarId);
  return (
    <img
      src={avatar.src}
      alt={avatar.label}
      className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
    />
  );
};

export default AvatarImg;
