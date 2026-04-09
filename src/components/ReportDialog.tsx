import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  reportedPostId?: string;
  reportedCommentId?: string;
  reportedUserId?: string;
}

const ReportDialog: React.FC<ReportDialogProps> = ({ open, onClose, reportedPostId, reportedCommentId, reportedUserId }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reason.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_post_id: reportedPostId || null,
      reported_comment_id: reportedCommentId || null,
      reported_user_id: reportedUserId || null,
      reason: reason.trim(),
    });
    if (!error) {
      toast.success('Report submitted');
      setReason('');
      onClose();
    } else {
      toast.error('Failed to submit report');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm space-y-4 animate-fade-in">
        <h3 className="text-lg font-bold">Report</h3>
        <Textarea
          placeholder="Describe the issue..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="bg-background border-border"
          maxLength={500}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!reason.trim() || submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;
