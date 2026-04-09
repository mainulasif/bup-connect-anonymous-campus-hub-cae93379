import React from 'react';
import AvatarImg from './AvatarImg';

interface EquippedItem {
  category: string;
  icon_url: string;
  name: string;
}

interface Props {
  avatarId: number;
  equippedItems?: EquippedItem[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizePixels = { sm: 28, md: 36, lg: 80 };

const AvatarWithAccessories: React.FC<Props> = ({ avatarId, equippedItems = [], size = 'md', className = '' }) => {
  const px = sizePixels[size];
  const overlayPx = Math.round(px * 0.5);

  const head = equippedItems.find(i => i.category === 'head');
  const face = equippedItems.find(i => i.category === 'face');
  const hand = equippedItems.find(i => i.category === 'hand');

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: px, height: px }}>
      <AvatarImg avatarId={avatarId} size={size} />
      {head && (
        <img src={head.icon_url} alt={head.name} className="absolute pointer-events-none"
          style={{ width: overlayPx, height: overlayPx, top: -overlayPx * 0.3, left: '50%', transform: 'translateX(-50%)' }} />
      )}
      {face && (
        <img src={face.icon_url} alt={face.name} className="absolute pointer-events-none"
          style={{ width: overlayPx, height: overlayPx, top: '25%', left: '50%', transform: 'translateX(-50%)' }} />
      )}
      {hand && (
        <img src={hand.icon_url} alt={hand.name} className="absolute pointer-events-none"
          style={{ width: overlayPx, height: overlayPx, bottom: 0, right: -overlayPx * 0.2 }} />
      )}
    </div>
  );
};

export default AvatarWithAccessories;
