import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StickerPack {
  id: string;
  name: string;
  icon_url: string;
}

interface Sticker {
  id: string;
  pack_id: string;
  emoji: string;
  label: string;
}

interface StickerPickerProps {
  onSelect: (sticker: string) => void;
  onClose: () => void;
}

const StickerPicker: React.FC<StickerPickerProps> = ({ onSelect, onClose }) => {
  const { user } = useAuth();
  const [ownedPacks, setOwnedPacks] = useState<StickerPack[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [activePack, setActivePack] = useState<string>('');

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      // Get owned packs
      const { data: owned } = await supabase.from('user_sticker_packs').select('pack_id').eq('user_id', user.id);
      const ownedIds = (owned || []).map(o => o.pack_id);
      // Also include free packs
      const { data: allPacks } = await supabase.from('sticker_packs').select('*');
      const freePacks = (allPacks || []).filter((p: any) => p.is_free);
      const freeIds = freePacks.map((p: any) => p.id);
      const allOwnedIds = [...new Set([...ownedIds, ...freeIds])];
      const packs = (allPacks || []).filter((p: any) => allOwnedIds.includes(p.id)) as StickerPack[];
      setOwnedPacks(packs);
      if (packs.length > 0) {
        setActivePack(packs[0].id);
        const { data: stickerData } = await supabase.from('sticker_pack_stickers').select('*').in('pack_id', allOwnedIds);
        setStickers((stickerData || []) as Sticker[]);
      }
    };
    fetch();
  }, [user]);

  const activeStickers = stickers.filter(s => s.pack_id === activePack);

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-xl p-3 shadow-lg animate-fade-in max-h-[200px] overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-1 overflow-x-auto">
          {ownedPacks.map(p => (
            <button key={p.id} onClick={() => setActivePack(p.id)}
              className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap ${activePack === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {p.icon_url} {p.name}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground ml-2">✕</button>
      </div>
      <div className="grid grid-cols-6 gap-2 overflow-y-auto max-h-[130px]">
        {activeStickers.map(s => (
          <button key={s.id} onClick={() => { onSelect(s.emoji); onClose(); }}
            className="text-2xl hover:bg-muted rounded-lg p-1 transition-colors">
            {s.emoji}
          </button>
        ))}
        {activeStickers.length === 0 && (
          <p className="col-span-6 text-xs text-muted-foreground text-center py-4">No stickers in this pack</p>
        )}
      </div>
    </div>
  );
};

export default StickerPicker;
