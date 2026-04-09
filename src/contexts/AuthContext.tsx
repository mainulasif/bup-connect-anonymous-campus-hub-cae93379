import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { FOUNDER_EMAIL } from '@/lib/badges';

export interface Profile {
  id: string;
  user_id: string;
  anonymous_name: string;
  username: string;
  avatar_url: string;
  avatar_id: number;
  bio: string;
  age: number | null;
  gender: string;
  points: number;
  is_banned: boolean;
  is_admin: boolean;
  is_jailed: boolean;
  is_muted: boolean;
  is_premium: boolean;
  is_online: boolean;
  ban_reason: string | null;
  ban_expires_at: string | null;
  jail_expires_at: string | null;
  gift_black_orchid: number;
  gift_plushie: number;
  gift_heart: number;
  gift_diamond: number;
  last_active_at: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isFounder: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isFounder: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setProfile(data as unknown as Profile);
      
      // Update online status
      await supabase.from('profiles').update({ is_online: true, last_active_at: new Date().toISOString() }).eq('user_id', userId);

      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      const hasAdmin = roleData?.some(r => r.role === 'admin') ?? false;
      setIsAdmin(hasAdmin);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsFounder(session?.user?.email === FOUNDER_EMAIL);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsFounder(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsFounder(session?.user?.email === FOUNDER_EMAIL);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set offline on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        navigator.sendBeacon && supabase.from('profiles').update({ is_online: false }).eq('user_id', user.id);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const signOut = async () => {
    if (user) {
      await supabase.from('profiles').update({ is_online: false }).eq('user_id', user.id);
    }
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsFounder(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isFounder, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
