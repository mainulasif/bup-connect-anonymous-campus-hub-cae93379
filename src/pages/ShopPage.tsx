import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreditCard, CheckCircle } from 'lucide-react';
import { GIFT_EMOJI } from '@/lib/gifts';

const ShopPage: React.FC = () => {
  const { profile } = useAuth();
  const [transactionId, setTransactionId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<'subscription' | 'artifacts'>('subscription');

  const giftCatalog = [
    { name: 'Black Orchid', price: '500 pts', emoji: GIFT_EMOJI['Black Orchid'] },
    { name: 'Plushie', price: '1,000 pts', emoji: GIFT_EMOJI.Plushie },
    { name: 'Heart', price: '2,000 pts', emoji: GIFT_EMOJI.Heart },
    { name: 'Diamond', price: '5,000 pts', emoji: GIFT_EMOJI.Diamond },
  ];

  const accessoryCatalog = ['Premium frames', 'Profile badges', 'Animated bubbles'];
  const avatarCatalog = ['Campus owl', 'Stealth cat', 'Midnight fox'];

  const handleSubmit = () => {
    if (!transactionId.trim()) {
      toast.error('Please enter your bKash transaction ID');
      return;
    }
    // Placeholder - in production this would create a subscription record
    setSubmitted(true);
    toast.success('Payment submitted for review! You\'ll be activated within 24 hours.');
  };

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Shop</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setTab('subscription')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'subscription' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
          >
            Subscription
          </button>
          <button
            onClick={() => setTab('artifacts')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'artifacts' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
          >
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
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> Ad-free experience</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> Premium accessories (coming soon)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> Custom stickers (coming soon)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> Priority support</li>
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
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
                  <p className="font-medium">Payment submitted!</p>
                  <p className="text-sm text-muted-foreground">We'll verify and activate within 24 hours.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="bKash Transaction ID"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    className="bg-background border-border"
                  />
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
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">Gifts</h3>
                <p className="text-sm text-muted-foreground">Send these from any user profile.</p>
              </div>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold">Accessories</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {accessoryCatalog.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold">Avatars</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {avatarCatalog.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

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
