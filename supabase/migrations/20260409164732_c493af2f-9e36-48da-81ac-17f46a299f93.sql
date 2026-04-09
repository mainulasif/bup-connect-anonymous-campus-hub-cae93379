
-- Fix admin_punish_user: double-ban prevention, founder protection, founder authorization
CREATE OR REPLACE FUNCTION public.admin_punish_user(
  _admin_id uuid, _target_user_id uuid, _action text,
  _duration_minutes integer DEFAULT NULL, _reason text DEFAULT 'Rule violation'
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  expires_at timestamptz;
  target_profile record;
  admin_email text;
  target_email text;
  is_founder boolean;
BEGIN
  -- Get admin email to check founder status
  SELECT email INTO admin_email FROM auth.users WHERE id = _admin_id;
  is_founder := (admin_email = '2252421086@student.bup.edu.bd');

  -- Must be admin or founder
  IF NOT is_founder AND NOT public.has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Founder protection: cannot punish the founder
  SELECT email INTO target_email FROM auth.users WHERE id = _target_user_id;
  IF target_email = '2252421086@student.bup.edu.bd' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot punish the Founder');
  END IF;

  -- Get target profile
  SELECT is_banned, is_jailed, ban_expires_at, jail_expires_at
  INTO target_profile FROM public.profiles WHERE user_id = _target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Double-punishment prevention
  IF _action = 'ban' AND target_profile.is_banned
     AND (target_profile.ban_expires_at IS NULL OR target_profile.ban_expires_at > now()) THEN
    RETURN json_build_object('success', false, 'error', 'User already has an active ban');
  END IF;

  IF _action = 'jail' AND target_profile.is_jailed
     AND (target_profile.jail_expires_at IS NULL OR target_profile.jail_expires_at > now()) THEN
    RETURN json_build_object('success', false, 'error', 'User is already in Jail');
  END IF;

  IF _duration_minutes IS NOT NULL AND _duration_minutes > 0 THEN
    expires_at := now() + (_duration_minutes || ' minutes')::interval;
  END IF;

  IF _action = 'ban' THEN
    UPDATE public.profiles SET is_banned = true, ban_reason = _reason, ban_expires_at = expires_at WHERE user_id = _target_user_id;
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (_admin_id, 'ban', _target_user_id, json_build_object('reason', _reason, 'duration_minutes', _duration_minutes)::jsonb);
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (_target_user_id, 'ban', 'You have been banned', 'Reason: ' || _reason || CASE WHEN expires_at IS NOT NULL THEN '. Expires: ' || expires_at::text ELSE '. Permanent.' END);

  ELSIF _action = 'unban' THEN
    UPDATE public.profiles SET is_banned = false, ban_reason = NULL, ban_expires_at = NULL WHERE user_id = _target_user_id;
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details) VALUES (_admin_id, 'unban', _target_user_id, '{}'::jsonb);
    INSERT INTO public.notifications (user_id, type, title, body) VALUES (_target_user_id, 'ban_expiry', 'You have been unbanned', 'Your ban has been lifted.');

  ELSIF _action = 'jail' THEN
    UPDATE public.profiles SET is_jailed = true, jail_expires_at = expires_at WHERE user_id = _target_user_id;
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES ('00000000-0000-0000-0000-000000000001', _target_user_id, 'member') ON CONFLICT DO NOTHING;
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (_admin_id, 'jail', _target_user_id, json_build_object('reason', _reason, 'duration_minutes', _duration_minutes)::jsonb);
    INSERT INTO public.notifications (user_id, type, title, body) VALUES (_target_user_id, 'jail', 'You have been sent to Jail', 'Reason: ' || _reason);

  ELSIF _action = 'unjail' THEN
    UPDATE public.profiles SET is_jailed = false, jail_expires_at = NULL WHERE user_id = _target_user_id;
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details) VALUES (_admin_id, 'unjail', _target_user_id, '{}'::jsonb);

  ELSIF _action = 'remove' THEN
    UPDATE public.profiles SET is_banned = true, ban_reason = 'Account permanently removed' WHERE user_id = _target_user_id;
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (_admin_id, 'remove_account', _target_user_id, json_build_object('reason', _reason)::jsonb);
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Add image_url to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Founder admin management RPCs
CREATE OR REPLACE FUNCTION public.founder_promote_admin(_founder_id uuid, _target_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  founder_email text;
BEGIN
  SELECT email INTO founder_email FROM auth.users WHERE id = _founder_id;
  IF founder_email != '2252421086@student.bup.edu.bd' THEN
    RETURN json_build_object('success', false, 'error', 'Only the Founder can promote admins');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.profiles SET is_admin = true WHERE user_id = _target_user_id;
  INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
  VALUES (_founder_id, 'promote_admin', _target_user_id, '{}'::jsonb);
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_target_user_id, 'role_change', 'You are now an Admin', 'The Founder has promoted you to App Admin.');
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_demote_admin(_founder_id uuid, _target_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  founder_email text;
  target_email text;
BEGIN
  SELECT email INTO founder_email FROM auth.users WHERE id = _founder_id;
  IF founder_email != '2252421086@student.bup.edu.bd' THEN
    RETURN json_build_object('success', false, 'error', 'Only the Founder can demote admins');
  END IF;
  SELECT email INTO target_email FROM auth.users WHERE id = _target_user_id;
  IF target_email = '2252421086@student.bup.edu.bd' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot demote the Founder');
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = 'admin';
  UPDATE public.profiles SET is_admin = false WHERE user_id = _target_user_id;
  INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
  VALUES (_founder_id, 'demote_admin', _target_user_id, '{}'::jsonb);
  RETURN json_build_object('success', true);
END;
$$;

-- Count DM messages per user for image restriction
CREATE OR REPLACE FUNCTION public.count_dm_messages(_conversation_id uuid, _user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT count(*)::integer FROM public.messages
  WHERE conversation_id = _conversation_id AND sender_id = _user_id;
$$;

-- Update messages INSERT policy to block banned/jailed users (except jail chat)
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND is_conversation_member(auth.uid(), conversation_id)
  AND NOT is_user_banned(auth.uid())
  AND (
    NOT COALESCE((SELECT is_jailed FROM public.profiles WHERE user_id = auth.uid()), false)
    OR conversation_id = '00000000-0000-0000-0000-000000000001'::uuid
  )
);

-- Fix posts UPDATE policy to also allow founder via is_admin on profile
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can soft-delete posts" ON public.posts FOR UPDATE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin')
  OR (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid())
);

-- Fix comments UPDATE policy similarly
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can soft-delete comments" ON public.comments FOR UPDATE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin')
  OR (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid())
);
