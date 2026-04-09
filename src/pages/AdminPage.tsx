import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Trash2, Ban, X, Eye, Clock, Shield, Users, Gavel, FileText, Download, Lock, BanIcon } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { BAN_DURATIONS } from '@/lib/constants';

interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reported_post_id: string | null;
  reported_comment_id: string | null;
  reported_user_id: string | null;
  reporter_id: string;
  reporter_name?: string;
  reported_name?: string;
  report_count?: number;
}

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
  actor_name?: string;
  target_name?: string;
}

interface Appeal {
  id: string;
  user_id: string;
  appeal_type: string;
  reason: string;
  status: string;
  created_at: string;
  user_name?: string;
}

type Tab = 'reports' | 'users' | 'audit' | 'appeals';

const AdminPage: React.FC = () => {
  const { isAdmin, isFounder, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [reportFilter, setReportFilter] = useState<'pending' | 'all'>('pending');
  const [banDialog, setBanDialog] = useState<{ userId: string; name: string } | null>(null);
  const [banDuration, setBanDuration] = useState(1440);
  const [banReason, setBanReason] = useState('');
  const [punishAction, setPunishAction] = useState<'ban' | 'jail'>('ban');

  const fetchReports = async () => {
    let q = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (reportFilter === 'pending') q = q.eq('status', 'pending');
    const { data } = await q;
    const rows = (data || []) as Report[];
    const allUserIds = [...new Set([...rows.map(r => r.reporter_id), ...rows.filter(r => r.reported_user_id).map(r => r.reported_user_id!)])];
    if (allUserIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, anonymous_name').in('user_id', allUserIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.anonymous_name]));
      rows.forEach(r => {
        r.reporter_name = nameMap.get(r.reporter_id) || 'Unknown';
        r.reported_name = r.reported_user_id ? nameMap.get(r.reported_user_id) || 'Unknown' : undefined;
      });
    }
    rows.forEach(r => {
      r.report_count = rows.filter(x => 
        (r.reported_post_id && x.reported_post_id === r.reported_post_id) ||
        (r.reported_comment_id && x.reported_comment_id === r.reported_comment_id) ||
        (r.reported_user_id && x.reported_user_id === r.reported_user_id)
      ).length;
    });
    setReports(rows);
  };

  const fetchAuditLog = async () => {
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
    const rows = (data || []) as AuditEntry[];
    const allIds = [...new Set([...rows.map(r => r.actor_id), ...rows.filter(r => r.target_user_id).map(r => r.target_user_id!)])];
    if (allIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, anonymous_name').in('user_id', allIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.anonymous_name]));
      rows.forEach(r => {
        r.actor_name = nameMap.get(r.actor_id) || 'Unknown';
        r.target_name = r.target_user_id ? nameMap.get(r.target_user_id) || 'Unknown' : undefined;
      });
    }
    setAuditLog(rows);
  };

  const fetchAppeals = async () => {
    const { data } = await supabase.from('appeals').select('*').order('created_at', { ascending: false });
    const rows = (data || []) as Appeal[];
    const userIds = [...new Set(rows.map(r => r.user_id))];
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, anonymous_name').in('user_id', userIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.anonymous_name]));
      rows.forEach(r => r.user_name = nameMap.get(r.user_id) || 'Unknown');
    }
    setAppeals(rows);
  };

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    if (tab === 'reports') fetchReports();
    if (tab === 'audit') fetchAuditLog();
    if (tab === 'appeals') fetchAppeals();
  }, [isAdmin, tab, reportFilter]);

  const handleReportAction = async (reportId: string, action: 'dismiss' | 'action') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    if (action === 'action') {
      if (report.reported_post_id) await supabase.from('posts').update({ is_deleted: true }).eq('id', report.reported_post_id);
      if (report.reported_comment_id) await supabase.from('comments').update({ is_deleted: true }).eq('id', report.reported_comment_id);
    }
    await supabase.from('reports').update({ status: action === 'dismiss' ? 'dismissed' : 'actioned' }).eq('id', reportId);
    if (user) {
      await supabase.from('audit_log').insert({
        actor_id: user.id, action: action === 'dismiss' ? 'dismiss_report' : 'action_report',
        target_user_id: report.reported_user_id,
        target_content_id: report.reported_post_id || report.reported_comment_id || undefined,
        details: { report_id: reportId, reason: report.reason },
      });
    }
    toast.success(action === 'dismiss' ? 'Report dismissed' : 'Content removed');
    await supabase.from('notifications').insert({
      user_id: report.reporter_id, type: 'report_result',
      title: action === 'dismiss' ? 'Report dismissed' : 'Report actioned',
      body: action === 'dismiss' ? 'Your report was reviewed and dismissed.' : 'Your report was reviewed and action was taken.',
      reference_id: reportId,
    });
    fetchReports();
  };

  const handlePunish = async () => {
    if (!banDialog || !user || !banReason.trim()) { toast.error('Ban reason is required'); return; }
    const duration = banDuration === 0 ? null : banDuration;
    const { error } = await supabase.rpc('admin_punish_user', {
      _admin_id: user.id, _target_user_id: banDialog.userId, _action: punishAction,
      _duration_minutes: duration, _reason: banReason,
    });
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success(`User ${punishAction === 'ban' ? 'banned' : 'jailed'}`);
    setBanDialog(null); setBanReason(''); fetchReports();
  };

  const handleAppealResponse = async (appealId: string, approved: boolean) => {
    const appeal = appeals.find(a => a.id === appealId);
    if (!appeal || !user) return;
    if (approved) {
      await supabase.rpc('admin_punish_user', {
        _admin_id: user.id, _target_user_id: appeal.user_id,
        _action: appeal.appeal_type === 'ban' ? 'unban' : 'unjail',
        _duration_minutes: null, _reason: 'Appeal approved',
      });
    }
    await supabase.from('appeals').update({
      status: approved ? 'approved' : 'denied',
      admin_response: approved ? 'Your appeal was approved' : 'Your appeal was denied',
      resolved_at: new Date().toISOString(),
    }).eq('id', appealId);
    await supabase.from('notifications').insert({
      user_id: appeal.user_id, type: 'appeal_result',
      title: approved ? 'Appeal Approved' : 'Appeal Denied',
      body: approved ? 'Your punishment has been lifted.' : 'Your appeal was reviewed and denied.',
    });
    toast.success(approved ? 'Appeal approved, punishment lifted' : 'Appeal denied');
    fetchAppeals();
  };

  const handleExportAudit = () => {
    const csv = 'Time,Actor,Action,Target,Details\n' + auditLog.map(e =>
      `"${new Date(e.created_at).toISOString()}","${e.actor_name}","${e.action}","${e.target_name || ''}","${JSON.stringify(e.details || {})}"`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit_log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'reports', label: 'Reports', icon: <Eye className="w-4 h-4" /> },
    { key: 'appeals', label: 'Appeals', icon: <Gavel className="w-4 h-4" /> },
    { key: 'audit', label: 'Audit', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-lg mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold text-primary">Admin Panel</h1>
      </header>

      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1 ${tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <div>
          <div className="flex gap-2 p-3 border-b border-border">
            <Button size="sm" variant={reportFilter === 'pending' ? 'default' : 'ghost'} onClick={() => setReportFilter('pending')}>Pending</Button>
            <Button size="sm" variant={reportFilter === 'all' ? 'default' : 'ghost'} onClick={() => setReportFilter('all')}>All</Button>
          </div>
          <div className="divide-y divide-border">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No reports</div>
            ) : reports.map(r => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      {r.reported_post_id ? <><FileText className="w-3 h-3" /> Post report</> : r.reported_comment_id ? <><FileText className="w-3 h-3" /> Comment report</> : <><Users className="w-3 h-3" /> User report</>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reported by: <span className="text-foreground">{r.reporter_name}</span> · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                    {r.reported_name && <p className="text-xs text-muted-foreground">Against: <span className="text-foreground">{r.reported_name}</span></p>}
                    {(r.report_count ?? 0) > 1 && <p className="text-xs text-destructive font-medium">{r.report_count} reports on this content</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : r.status === 'actioned' ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'}`}>{r.status}</span>
                </div>
                <p className="text-sm bg-card p-3 rounded-lg border border-border">{r.reason}</p>
                {r.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="destructive" onClick={() => handleReportAction(r.id, 'action')}>
                      <Trash2 className="w-3 h-3 mr-1" /> Remove Content
                    </Button>
                    {r.reported_user_id && (
                      <Button size="sm" variant="destructive" onClick={() => setBanDialog({ userId: r.reported_user_id!, name: r.reported_name || 'User' })}>
                        <Ban className="w-3 h-3 mr-1" /> Ban/Jail
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleReportAction(r.id, 'dismiss')}>
                      <X className="w-3 h-3 mr-1" /> Dismiss
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'appeals' && (
        <div className="divide-y divide-border">
          {appeals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No appeals</div>
          ) : appeals.map(a => (
            <div key={a.id} className="p-4 space-y-2">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">{a.user_name} — {a.appeal_type} appeal</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>{a.status}</span>
              </div>
              <p className="text-sm bg-card p-3 rounded-lg border border-border">{a.reason}</p>
              {a.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAppealResponse(a.id, true)}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleAppealResponse(a.id, false)}>Deny</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <div className="p-3 border-b border-border flex justify-end">
            <Button size="sm" variant="outline" onClick={handleExportAudit}><Download className="w-3 h-3 mr-1" /> Export CSV</Button>
          </div>
          <div className="divide-y divide-border">
            {auditLog.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No audit entries</div>
            ) : auditLog.map(e => (
              <div key={e.id} className="p-4">
                <p className="text-sm">
                  <span className="font-medium text-primary">{e.actor_name}</span>
                  {' '}<span className="text-muted-foreground">{e.action}</span>
                  {e.target_name && <>{' → '}<span className="font-medium">{e.target_name}</span></>}
                </p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                {e.details && Object.keys(e.details).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{JSON.stringify(e.details)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {banDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold">Punish {banDialog.name}</h3>
            <div className="flex gap-2">
              <Button size="sm" variant={punishAction === 'ban' ? 'default' : 'ghost'} onClick={() => setPunishAction('ban')}><Ban className="w-3 h-3 mr-1" /> Ban</Button>
              <Button size="sm" variant={punishAction === 'jail' ? 'default' : 'ghost'} onClick={() => setPunishAction('jail')}><Lock className="w-3 h-3 mr-1" /> Jail</Button>
            </div>
            <select value={banDuration} onChange={e => setBanDuration(Number(e.target.value))} className="w-full bg-background border border-border rounded-lg p-2 text-sm text-foreground">
              {BAN_DURATIONS.map(d => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
            </select>
            <Textarea placeholder="Reason (required)" value={banReason} onChange={e => setBanReason(e.target.value)} className="bg-background border-border" maxLength={500} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setBanDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handlePunish} disabled={!banReason.trim()}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
