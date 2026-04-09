import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  reference_id: string | null;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifs = async () => {
    if (!user) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setNotifications((data || []) as Notification[]);
  };

  useEffect(() => { fetchNotifs(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const typeIcon: Record<string, string> = {
    dm: '💬', gift: '🎁', report_result: '📋', jail: '⛓️', ban: '🚫', ban_expiry: '✅', jail_expiry: '✅', mention: '📢', appeal_result: '⚖️',
  };

  return (
    <div className="max-w-lg mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold flex-1">Notifications</h1>
        <button onClick={markAllRead} className="text-xs text-primary"><Check className="w-4 h-4 inline mr-1" />Mark all read</button>
      </header>

      <div className="divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No notifications</div>
        ) : notifications.map(n => (
          <button key={n.id} onClick={() => markRead(n.id)} className={`w-full text-left p-4 transition-colors ${n.is_read ? '' : 'bg-primary/5'}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{typeIcon[n.type] || '🔔'}</span>
              <div className="flex-1">
                <p className={`text-sm ${n.is_read ? 'text-muted-foreground' : 'font-medium'}`}>{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5"></span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
