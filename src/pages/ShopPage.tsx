import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, ShoppingBag, Palette, Smile } from 'lucide-react';
import { GIFT_EMOJI } from '@/lib/gifts';

interface ShopItem {
  id: string; name: string; category: string; icon_url: string; price: number; description: string;
}
interface BubbleColor {
  id: string; name: string; css_class: string; price: number;
}
interface StickerPack {
  id: string; name: string; icon_url: string; price: number; is_free: boolean;
}

const ShopPage: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [transactionId, setTransactionId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<'subscription' | 'artifacts'>('subscription');
  const [artifactTab, setArtifactTab] = useState<'gifts' | 'accessories' | 'bubbles' | 'stickers'>('gifts');
  const [accessoryCategory, setAccessoryCategory] = useState<'face' | 'hand' | 'head'>('face');
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [ownedItemIds, setOwnedItemIds] = useState<Set<string>>(new Set());
  const [purchasing, setPurchasing] = useState(false);
  const [bubbleColors, setBubbleColors] = useState<BubbleColor[]>([]);
  const [ownedColorIds, setOwnedColorIds] = useState<Set<string>>(new Set());
  const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
  const [ownedPackIds, setOwnedPackIds] = useState<Set<string>>(new Set());

  const giftCatalog = [
    { name: 'Black Orchid', price: '1,000 pts', emoji: GIFT_EMOJI['Black Orchid'] },
    { name: 'Plushie', price: '2,500 pts', emoji: GIFT_EMOJI.Plushie },
    { name: 'Heart', price: '5,000 pts', emoji: GIFT_EMOJI.Heart },
    { name: 'Diamond', price: '10,000 pts', emoji: GIFT_EMOJI.Diamond },
  ];

  const fetchShopData = async () => {
    const [itemsRes, bubblesRes, stickersRes] = await Promise.all([
      supabase.from('shop_items').select('*').order('price', { ascending: true }),
      supabase.from('bubble_colors').select('*').order('price', { ascending: true }),
      supabase.from('sticker_packs').select('*').order('price', { ascending: true }),
    ]);
    setShopItems((itemsRes.data || []) as ShopItem[]);
    setBubbleColors((bubblesRes.data || []) as BubbleColor[]);
    setStickerPacks((stickersRes.data || []) as StickerPack[]);
    if (user) {
      const [ownedRes, colorRes, packRes] = await Promise.all([
        supabase.from('user_items').select('item_id').eq('user_id', user.id),
        supabase.from('purchased_bubble_colors').select('color_id').eq('user_id', user.id),
        supabase.from('user_sticker_packs').select('pack_id').eq('user_id', user.id),
      ]);
      setOwnedItemIds(new Set((ownedRes.data || []).map(o => o.item_id)));
      setOwnedColorIds(new Set((colorRes.data || []).map(o => o.color_id)));
      setOwnedPackIds(new Set((packRes.data || []).map(o => o.pack_id)));
    }
  };

  useEffect(() => { fetchShopData(); }, [user]);

  const handleSubmit = () => {
    if (!transactionId.trim()) { toast.error('Please enter your bKash transaction ID'); return; }
    setSubmitted(true);
    toast.success('Payment submitted for review!');
  };

  const handlePurchase = async (itemId: string) => {
    if (!user) return;
    setPurchasing(true);
    const { data, error } = await supabase.rpc('purchase_item', { p_item_id: itemId });
    setPurchasing(false);
    if (error) { toast.error('Purchase failed'); return; }
    const result = data as any;
    if (!result?.success) { toast.error(result?.error || 'Purchase failed'); return; }
    toast.success(`Purchased! ${result.points_spent} points spent`);
    refreshProfile();
    fetchShopData();
  };

  const handleBuyBubble = async (colorId: string) => {
    if (!user) return;
    setPurchasing(true);
    const { data, error } = await supabase.rpc('purchase_bubble_color', { p_color_id: colorId });
    setPurchasing(false);
    if (error) { toast.error('Purchase failed'); return; }
    const result = data as any;
    if (!result?.success) { toast.error(result?.error || 'Purchase failed'); return; }
    toast.success(`Bubble color applied! ${result.points_spent} points spent`);
    refreshProfile();
    fetchShopData();
  };

  const handleBuyStickerPack = async (packId: string) => {
    if (!user) return;
    setPurchasing(true);
    const { data, error } = await supabase.rpc('purchase_sticker_pack', { p_pack_id: packId });
    setPurchasing(false);
    if (error) { toast.error('Purchase failed'); return; }
    const result = data as any;
    if (!result?.success) { toast.error(result?.error || 'Purchase failed'); return; }
    toast.success(`Sticker pack unlocked! ${result.points_spent} points spent`);
    refreshProfile();
    fetchShopData();
  };

  const filteredItems = shopItems.filter(i => i.category === accessoryCategory);

  // Use shared utility for preview colors

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Shop</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-1">
          <button onClick={() => setTab('subscription')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'subscription' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}>
            Subscription
          </button>
          <button onClick={() => setTab('artifacts')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'artifacts' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}>
            Artifacts
          </button>
        </div>

        {tab === 'subscription' ? (
          <>
            <div className="bg-card rounded-xl border border-primary/30 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">BUP Connect Premium</h3>
                  <p className="text-sm text-muted-foreground">30 days access</p>
                </div>
              </div>
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-primary">৳50</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Ad-free experience</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Premium accessories</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Exclusive stickers</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Priority support</li>
              </ul>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <h3 className="font-bold">Pay via bKash</h3>
              <div className="bg-background rounded-lg p-4 text-sm space-y-2">
                <p><span className="text-muted-foreground">1.</span> Send <span className="font-bold text-primary">৳50</span> to bKash number:</p>
                <p className="text-lg font-bold text-center text-primary">01XXXXXXXXX</p>
                <p><span className="text-muted-foreground">2.</span> Enter your Transaction ID below</p>
              </div>
              {submitted ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="font-medium">Payment submitted!</p>
                  <p className="text-sm text-muted-foreground">We'll verify and activate within 24 hours.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input placeholder="bKash Transaction ID" value={transactionId} onChange={e => setTransactionId(e.target.value)} className="bg-background border-border" />
                  <Button onClick={handleSubmit} className="w-full">Submit Payment</Button>
                </div>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">Your Points Balance</p>
              <p className="text-2xl font-bold text-primary">{profile?.points.toLocaleString() || 0}</p>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1">
              {(['gifts', 'accessories', 'bubbles', 'stickers'] as const).map(t => (
                <button key={t} onClick={() => setArtifactTab(t)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${artifactTab === t ? 'bg-background text-foreground' : 'text-muted-foreground'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {artifactTab === 'gifts' ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Send these from any user profile.</p>
                <div className="grid grid-cols-2 gap-3">
                  {giftCatalog.map(item => (
                    <div key={item.name} className="rounded-xl border border-border bg-card p-4 text-center">
                      <div className="text-4xl leading-none">{item.emoji}</div>
                      <p className="mt-2 text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : artifactTab === 'accessories' ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(['face', 'hand', 'head'] as const).map(cat => (
                    <button key={cat} onClick={() => setAccessoryCategory(cat)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${accessoryCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-border'}`}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredItems.map(item => {
                    const owned = ownedItemIds.has(item.id);
                    return (
                      <div key={item.id} className="rounded-xl border border-border bg-card p-4 text-center space-y-2">
                        <img src={item.icon_url} alt={item.name} className="w-12 h-12 mx-auto" />
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                        <p className="text-xs font-bold text-primary">{item.price.toLocaleString()} pts</p>
                        {owned ? (
                          <span className="inline-block text-[10px] bg-green-500/20 text-green-400 rounded-full px-2 py-0.5">Owned</span>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handlePurchase(item.id)} disabled={purchasing}>
                            <ShoppingBag className="w-3 h-3 mr-1" /> Buy
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : artifactTab === 'stickers' ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Buy sticker packs to use in chats.</p>
                <div className="grid grid-cols-2 gap-3">
                  {stickerPacks.map(pack => {
                    const owned = ownedPackIds.has(pack.id) || pack.is_free;
                    return (
                      <div key={pack.id} className={`rounded-xl border p-4 text-center space-y-2 ${owned ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card'}`}>
                        <div className="text-4xl leading-none">{pack.icon_url}</div>
                        <p className="text-sm font-medium">{pack.name}</p>
                        <p className="text-xs font-bold text-primary">{pack.is_free ? 'Free' : `${pack.price.toLocaleString()} pts`}</p>
                        {owned ? (
                          <span className="inline-block text-[10px] bg-green-500/20 text-green-400 rounded-full px-2 py-0.5">Owned</span>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleBuyStickerPack(pack.id)} disabled={purchasing}>
                            <Smile className="w-3 h-3 mr-1" /> Buy
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Chat Bubbles */
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Buy and switch between chat bubble colors anytime. Owned colors are saved.</p>
                <div className="grid grid-cols-2 gap-3">
                  {bubbleColors.map(bc => {
                    const isActive = (profile as any)?.bubble_color === bc.css_class;
                    const owned = ownedColorIds.has(bc.id) || bc.price === 0;
                    const previewColor = bubblePreviewColors[bc.css_class] || '#6366f1';
                    return (
                      <div key={bc.id} className={`rounded-xl border p-4 text-center space-y-2 ${isActive ? 'border-primary bg-primary/10' : owned ? 'border-green-500/30' : 'border-border bg-card'}`}>
                        <div className="w-full h-8 rounded-lg flex items-center justify-center" style={{ background: bc.css_class.includes('gradient') ? 'linear-gradient(to right, #8b5cf6, #22d3ee)' : previewColor }}>
                          <span className="text-white text-xs font-medium">Hello!</span>
                        </div>
                        <p className="text-sm font-medium">{bc.name}</p>
                        <p className="text-xs font-bold text-primary">{bc.price === 0 ? 'Free' : `${bc.price.toLocaleString()} pts`}</p>
                        {isActive ? (
                          <span className="inline-block text-[10px] bg-green-500/20 text-green-400 rounded-full px-2 py-0.5">Active</span>
                        ) : owned ? (
                          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleBuyBubble(bc.id)} disabled={purchasing}>
                            <Palette className="w-3 h-3 mr-1" /> Apply
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleBuyBubble(bc.id)} disabled={purchasing}>
                            <Palette className="w-3 h-3 mr-1" /> Buy
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">Your Points Balance</p>
              <p className="text-2xl font-bold text-primary">{profile?.points.toLocaleString() || 0}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
