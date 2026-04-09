import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Flower2, Gift, Heart, Diamond } from 'lucide-react';

interface GiftType {
  id: string;
  name: string;
  price: number;
  icon: string;
}

interface GiftDialogProps {
  open: boolean;
  onClose: () => void;
  receiverId: string;
}

const ICONS: Record<string, React.ReactNode> = {
  'Black Orchid': <Flower2 className="w-8 h-8" />,
  'Plushie': <Gift className="w-8 h-8 text-gift-plushie" />,
  'Heart': <Heart className="w-8 h-8 text-gift-heart" />,
  'Diamond': <Diamond className="w-8 h-8 text-gift-diamond" />,
};

const GiftDialog: React.FC<GiftDialogProps> = ({ open, onClose, receiverId }) => {
  const { user, refreshProfile } = useAuth();
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('gift_types').select('*').order('price').then(({ data }) => {
        if (data) setGiftTypes(data);
      });
    }
  }, [open]);

  if (!open) return null;

  const handleSend = async (giftTypeId: string) => {
    if (!user) return;
    setSending(true);
    const { data, error } = await supabase.rpc('send_gift', {
      p_sender_id: user.id,
      p_receiver_id: receiverId,
      p_gift_type_id: giftTypeId,
    });
    
    if (error) {
      toast.error('Failed to send gift');
    } else {
      const result = data as any;
      if (result?.success) {
        toast.success(`Gift sent! -${result.points_deducted} points`);
        refreshProfile();
        onClose();
      } else {
        toast.error(result?.error || 'Failed to send gift');
      }
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-card border-t border-border rounded-t-2xl p-6 w-full max-w-lg animate-slide-up safe-bottom">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Send a Gift</h3>
          <button onClick={onClose} className="text-muted-foreground text-sm">Close</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {giftTypes.map(g => (
            <button
              key={g.id}
              onClick={() => handleSend(g.id)}
              disabled={sending}
              className="bg-background border border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors disabled:opacity-50"
            >
              {ICONS[g.name] || <Gift className="w-8 h-8" />}
              <span className="text-sm font-medium">{g.name}</span>
              <span className="text-xs text-primary font-bold">{g.price.toLocaleString()} pts</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">Receiver gets 50% of gift value as points</p>
      </div>
    </div>
  );
};

export default GiftDialog;
