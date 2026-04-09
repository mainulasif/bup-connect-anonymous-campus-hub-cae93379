import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';

const AppLayout: React.FC = () => {
  const { profile } = useAuth();

  if (profile?.is_banned) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Account Banned</h1>
          <p className="text-muted-foreground">Your account has been banned from BUP Connect for violating community guidelines.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Outlet />
      <BottomNav />
    </div>
  );
};

export default AppLayout;
