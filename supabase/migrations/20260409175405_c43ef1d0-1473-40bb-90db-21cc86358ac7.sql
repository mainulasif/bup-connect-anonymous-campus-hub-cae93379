
-- RPC for soft-deleting a post
CREATE OR REPLACE FUNCTION public.soft_delete_post(_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_post_owner uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT user_id INTO v_post_owner FROM public.posts WHERE id = _post_id AND is_deleted = false;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Post not found');
  END IF;

  -- Check: owner, admin role, or profile admin
  IF v_user_id != v_post_owner
     AND NOT has_role(v_user_id, 'admin'::app_role)
     AND NOT COALESCE((SELECT is_admin FROM profiles WHERE user_id = v_user_id), false) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.posts SET is_deleted = true, updated_at = now() WHERE id = _post_id;
  RETURN json_build_object('success', true);
END;
$$;

-- RPC for soft-deleting a comment
CREATE OR REPLACE FUNCTION public.soft_delete_comment(_comment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_comment_owner uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT user_id INTO v_comment_owner FROM public.comments WHERE id = _comment_id AND is_deleted = false;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Comment not found');
  END IF;

  IF v_user_id != v_comment_owner
     AND NOT has_role(v_user_id, 'admin'::app_role)
     AND NOT COALESCE((SELECT is_admin FROM profiles WHERE user_id = v_user_id), false) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.comments SET is_deleted = true, updated_at = now() WHERE id = _comment_id;
  RETURN json_build_object('success', true);
END;
$$;

-- Recreate all missing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_founder ON auth.users;
CREATE TRIGGER on_auth_user_created_founder
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_founder_account();

DROP TRIGGER IF EXISTS award_message_point_trigger ON public.messages;
CREATE TRIGGER award_message_point_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.award_message_point();

DROP TRIGGER IF EXISTS award_comment_point_trigger ON public.comments;
CREATE TRIGGER award_comment_point_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.award_comment_point();

DROP TRIGGER IF EXISTS touch_conversation_on_message ON public.messages;
CREATE TRIGGER touch_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated_at();

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Signal PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
