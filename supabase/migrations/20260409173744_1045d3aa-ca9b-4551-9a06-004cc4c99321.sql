
-- Drop any partially created triggers first
DROP TRIGGER IF EXISTS on_auth_user_created_founder ON auth.users;
DROP TRIGGER IF EXISTS award_message_point_trigger ON public.messages;
DROP TRIGGER IF EXISTS award_comment_point_trigger ON public.comments;
DROP TRIGGER IF EXISTS touch_conversation_on_message ON public.messages;
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Recreate all triggers
CREATE TRIGGER on_auth_user_created_founder
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_founder_account();

CREATE TRIGGER award_message_point_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.award_message_point();

CREATE TRIGGER award_comment_point_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.award_comment_point();

CREATE TRIGGER touch_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated_at();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fix posts soft-delete policy
DROP POLICY IF EXISTS "Users can soft-delete posts" ON public.posts;
CREATE POLICY "Users can soft-delete posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (SELECT is_admin FROM profiles WHERE profiles.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (SELECT is_admin FROM profiles WHERE profiles.user_id = auth.uid())
  );

-- Fix comments soft-delete policy
DROP POLICY IF EXISTS "Users can soft-delete comments" ON public.comments;
CREATE POLICY "Users can soft-delete comments" ON public.comments
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (SELECT is_admin FROM profiles WHERE profiles.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (SELECT is_admin FROM profiles WHERE profiles.user_id = auth.uid())
  );

-- Allow admins to update profiles (for punishments)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (SELECT is_admin FROM profiles WHERE profiles.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (SELECT is_admin FROM profiles WHERE profiles.user_id = auth.uid())
  );
