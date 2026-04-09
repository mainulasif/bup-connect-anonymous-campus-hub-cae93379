import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    } else {
      // Check if already in a recovery session
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true);
        else { toast.error('Invalid or expired reset link'); navigate('/auth'); }
      });
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password updated! Redirecting...');
    setTimeout(() => navigate('/'), 1500);
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Verifying...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary">Reset Password</h1>
          <p className="text-muted-foreground text-sm">Enter your new password</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <Input type="password" placeholder="New password (min 6 chars)" value={password}
            onChange={e => setPassword(e.target.value)} className="bg-card border-border" required minLength={6} />
          <Input type="password" placeholder="Confirm new password" value={confirm}
            onChange={e => setConfirm(e.target.value)} className="bg-card border-border" required minLength={6} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
