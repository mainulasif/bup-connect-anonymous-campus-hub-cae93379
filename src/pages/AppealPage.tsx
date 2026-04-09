import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const AppealPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const appealType = profile?.is_banned ? 'ban' : profile?.is_jailed ? 'jail' : null;

  const handleSubmit = async () => {
    if (!reason.trim() || !user || !appealType) return;
    setSubmitting(true);
    
    // Check if user already has a pending appeal
    const { data: existing } = await supabase.from('appeals').select('id').eq('user_id', user.id).eq('status', 'pending').maybeSingle();
    if (existing) { toast.error('You already have a pending appeal'); setSubmitting(false); return; }

    const { error } = await supabase.from('appeals').insert({
      user_id: user.id,
      appeal_type: appealType,
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error('Failed to submit appeal'); return; }
    setSubmitted(true);
    toast.success('Appeal submitted');
  };

  if (!appealType) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <p className="text-muted-foreground">You don't have any active punishment to appeal.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Go back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Submit Appeal</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm font-medium">{appealType === 'ban' ? '🚫 You are banned' : '⛓️ You are in jail'}</p>
          {profile?.ban_reason && <p className="text-xs text-muted-foreground mt-1">Reason: {profile.ban_reason}</p>}
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📨</p>
            <p className="font-medium">Appeal submitted</p>
            <p className="text-sm text-muted-foreground">An admin will review your appeal. You will be notified of the result.</p>
          </div>
        ) : (
          <>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why your punishment should be lifted..." className="bg-card border-border min-h-[120px]" maxLength={1000} />
            <Button onClick={handleSubmit} disabled={!reason.trim() || submitting} className="w-full">
              {submitting ? 'Submitting...' : 'Submit Appeal'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">You can only submit one appeal per punishment.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AppealPage;
