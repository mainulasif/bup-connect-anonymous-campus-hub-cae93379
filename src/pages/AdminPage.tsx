import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Ban, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reported_post_id: string | null;
  reported_comment_id: string | null;
  reported_user_id: string | null;
  reporter_id: string;
}

const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('status', tab === 'pending' ? 'pending' : 'reviewed')
      .order('created_at', { ascending: false });
    setReports((data as any) || []);
  };

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchReports();
  }, [isAdmin, tab]);

  const handleAction = async (reportId: string, action: 'dismiss' | 'action') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (action === 'action') {
      // Delete reported content
      if (report.reported_post_id) {
        await supabase.from('posts').update({ is_deleted: true }).eq('id', report.reported_post_id);
      }
      if (report.reported_comment_id) {
        await supabase.from('comments').update({ is_deleted: true }).eq('id', report.reported_comment_id);
      }
    }

    await supabase.from('reports').update({
      status: action === 'dismiss' ? 'dismissed' : 'actioned',
    }).eq('id', reportId);

    toast.success(action === 'dismiss' ? 'Report dismissed' : 'Content removed');
    fetchReports();
  };

  const handleBanUser = async (userId: string) => {
    await supabase.from('profiles').update({ is_banned: true }).eq('user_id', userId);
    toast.success('User banned');
    fetchReports();
  };

  if (!isAdmin) return null;

  return (
    <div className="max-w-lg mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold text-primary">Admin Panel</h1>
      </header>

      <div className="flex border-b border-border">
        {(['pending', 'reviewed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border">
        {reports.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No {tab} reports</div>
        ) : (
          reports.map(r => (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">
                    {r.reported_post_id ? 'Post report' : r.reported_comment_id ? 'Comment report' : 'User report'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === 'pending' ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'
                }`}>
                  {r.status}
                </span>
              </div>
              <p className="text-sm bg-card p-3 rounded-lg border border-border">{r.reason}</p>
              
              {tab === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => handleAction(r.id, 'action')}>
                    <Trash2 className="w-3 h-3 mr-1" /> Remove Content
                  </Button>
                  {r.reported_user_id && (
                    <Button size="sm" variant="destructive" onClick={() => handleBanUser(r.reported_user_id!)}>
                      <Ban className="w-3 h-3 mr-1" /> Ban User
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleAction(r.id, 'dismiss')}>
                    <X className="w-3 h-3 mr-1" /> Dismiss
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPage;
