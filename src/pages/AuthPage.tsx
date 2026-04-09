import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const BUP_DOMAIN = '@student.bup.edu.bd';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (e: string) => e.toLowerCase().endsWith(BUP_DOMAIN);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast.error('Only @student.bup.edu.bd emails are allowed');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
        if (error) throw error;
        toast.success('Welcome back!');
      } else if (mode === 'signup') {
        if (password.length < 6) { toast.error('Password must be at least 6 characters'); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email: email.toLowerCase(), password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        toast.success('Account created! Check your email to verify.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset link sent! Check your email.');
        setMode('login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">BUP Connect</h1>
          <p className="text-muted-foreground text-sm">Anonymous campus social for BUP students</p>
        </div>

        {mode === 'forgot' && (
          <button onClick={() => setMode('login')} className="flex items-center gap-1 text-sm text-primary">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </button>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <Input type="email" placeholder="yourID@student.bup.edu.bd" value={email}
            onChange={e => setEmail(e.target.value)} className="bg-card border-border" required />
          {mode !== 'forgot' && (
            <Input type="password" placeholder="Password (min 6 chars)" value={password}
              onChange={e => setPassword(e.target.value)} className="bg-card border-border" required minLength={6} />
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </Button>
        </form>

        {mode === 'login' && (
          <button onClick={() => setMode('forgot')} className="block w-full text-center text-sm text-primary hover:underline">
            Forgot password?
          </button>
        )}

        {mode !== 'forgot' && (
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-primary hover:underline font-medium">
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground/60">
          Your identity stays anonymous. Only @student.bup.edu.bd emails accepted.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
