
-- Fix notification insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Fix audit log insert policy  
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
