
-- 1. Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS avatar_id integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS ban_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS jail_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_jailed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Generate unique username for existing profiles
UPDATE public.profiles SET username = 'User_' || substr(user_id::text, 1, 8) WHERE username IS NULL;
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- 2. Add columns to conversation_members
ALTER TABLE public.conversation_members 
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false;

-- 3. Add columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS rules text,
  ADD COLUMN IF NOT EXISTS is_discoverable boolean DEFAULT true;

-- 4. Add columns to messages for deletion
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_deleted_for_all boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_users uuid[] DEFAULT '{}';

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  reference_id text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 6. Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  target_content_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- 7. Create appeals table
CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  appeal_type text NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending',
  admin_response text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own appeals" ON public.appeals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create appeals" ON public.appeals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all appeals" ON public.appeals FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update appeals" ON public.appeals FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 8. Create group_invites table
CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invited users can view their invites" ON public.group_invites FOR SELECT USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);
CREATE POLICY "Members can create invites" ON public.group_invites FOR INSERT WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "Invited users can update invites" ON public.group_invites FOR UPDATE USING (auth.uid() = invited_user_id);

-- 9. Create pinned_messages table
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content text NOT NULL,
  pinned_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view pinned messages" ON public.pinned_messages FOR SELECT USING (
  public.is_conversation_member(auth.uid(), conversation_id)
  OR EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND type = 'public_group')
);
CREATE POLICY "Creator/admin can manage pins" ON public.pinned_messages FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = pinned_messages.conversation_id 
    AND user_id = auth.uid() 
    AND role IN ('creator', 'moderator')
  )
);
CREATE POLICY "Creator/admin can delete pins" ON public.pinned_messages FOR DELETE USING (
  public.has_role(auth.uid(), 'admin')
  OR auth.uid() = pinned_by
);

-- 10. Auto-expiry function for bans and jail
CREATE OR REPLACE FUNCTION public.check_and_clear_expired_punishments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear expired bans
  UPDATE public.profiles 
  SET is_banned = false, ban_reason = NULL, ban_expires_at = NULL
  WHERE is_banned = true AND ban_expires_at IS NOT NULL AND ban_expires_at <= now();
  
  -- Clear expired jail
  UPDATE public.profiles 
  SET is_jailed = false, jail_expires_at = NULL
  WHERE is_jailed = true AND jail_expires_at IS NOT NULL AND jail_expires_at <= now();
END;
$$;

-- 11. Updated is_user_banned to check expiry
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE 
        WHEN ban_expires_at IS NOT NULL AND ban_expires_at <= now() THEN false
        ELSE is_banned
      END
    FROM public.profiles WHERE user_id = _user_id), 
    false
  )
$$;

-- 12. Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action text, _window_minutes integer, _max_count integer)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  IF _action = 'post' THEN
    SELECT count(*) INTO recent_count FROM public.posts 
    WHERE user_id = _user_id AND created_at > now() - (_window_minutes || ' minutes')::interval;
  ELSIF _action = 'comment' THEN
    SELECT count(*) INTO recent_count FROM public.comments 
    WHERE user_id = _user_id AND created_at > now() - (_window_minutes || ' minutes')::interval;
  ELSIF _action = 'message' THEN
    SELECT count(*) INTO recent_count FROM public.messages 
    WHERE sender_id = _user_id AND created_at > now() - (_window_minutes || ' minutes')::interval;
  ELSIF _action = 'report' THEN
    SELECT count(*) INTO recent_count FROM public.reports 
    WHERE reporter_id = _user_id AND created_at > now() - (_window_minutes || ' minutes')::interval;
  ELSE
    RETURN true;
  END IF;
  
  RETURN recent_count < _max_count;
END;
$$;

-- 13. Profanity filter word list table
CREATE TABLE IF NOT EXISTS public.profanity_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profanity_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profanity words" ON public.profanity_words FOR SELECT USING (true);
CREATE POLICY "Admins can manage profanity words" ON public.profanity_words FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed some basic profanity words
INSERT INTO public.profanity_words (word) VALUES 
  ('fuck'), ('shit'), ('ass'), ('bitch'), ('dick'), ('pussy'), ('damn'), ('bastard'),
  ('cunt'), ('whore'), ('slut'), ('nigger'), ('faggot'), ('retard')
ON CONFLICT (word) DO NOTHING;

-- 14. Profanity check function
CREATE OR REPLACE FUNCTION public.check_profanity(_text text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profanity_words 
    WHERE lower(_text) LIKE '%' || lower(word) || '%'
  )
$$;

-- 15. Update conversation visibility for private groups
UPDATE public.conversations SET is_discoverable = false WHERE type = 'private_group';
UPDATE public.conversations SET is_discoverable = true WHERE type = 'public_group';

-- 16. Create Jail conversation
INSERT INTO public.conversations (id, name, type, created_by, is_discoverable, rules)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Jail ⛓️',
  'public_group',
  NULL,
  false,
  'This is the jail. You are here because of a rule violation. Behave and wait for your sentence to expire.'
) ON CONFLICT (id) DO NOTHING;

-- 17. Update conversations SELECT policy to hide non-discoverable private groups
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations" ON public.conversations FOR SELECT TO authenticated
USING (
  is_conversation_member(auth.uid(), id) 
  OR (type = 'public_group' AND is_discoverable = true)
  OR public.has_role(auth.uid(), 'admin')
);

-- 18. Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_user ON public.appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON public.profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_group_invites_user ON public.group_invites(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_conv ON public.pinned_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON public.messages(is_deleted_for_all);

-- 19. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 20. Ban/jail admin function
CREATE OR REPLACE FUNCTION public.admin_punish_user(
  _admin_id uuid,
  _target_user_id uuid,
  _action text,
  _duration_minutes integer DEFAULT NULL,
  _reason text DEFAULT 'Rule violation'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expires_at timestamptz;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  IF _duration_minutes IS NOT NULL THEN
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
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (_admin_id, 'unban', _target_user_id, '{}'::jsonb);
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (_target_user_id, 'ban_expiry', 'You have been unbanned', 'Your ban has been lifted.');
  ELSIF _action = 'jail' THEN
    UPDATE public.profiles SET is_jailed = true, jail_expires_at = expires_at WHERE user_id = _target_user_id;
    -- Add to jail conversation
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES ('00000000-0000-0000-0000-000000000001', _target_user_id, 'member')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (_admin_id, 'jail', _target_user_id, json_build_object('reason', _reason, 'duration_minutes', _duration_minutes)::jsonb);
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (_target_user_id, 'jail', 'You have been sent to Jail', 'Reason: ' || _reason);
  ELSIF _action = 'unjail' THEN
    UPDATE public.profiles SET is_jailed = false, jail_expires_at = NULL WHERE user_id = _target_user_id;
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (_admin_id, 'unjail', _target_user_id, '{}'::jsonb);
  ELSIF _action = 'remove' THEN
    UPDATE public.profiles SET is_banned = true, ban_reason = 'Account permanently removed' WHERE user_id = _target_user_id;
    INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
    VALUES (_admin_id, 'remove_account', _target_user_id, json_build_object('reason', _reason)::jsonb);
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;
