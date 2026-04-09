-- Remove duplicate message point triggers, keep only one
DROP TRIGGER IF EXISTS award_message_point_trigger ON public.messages;
DROP TRIGGER IF EXISTS trg_award_message_point ON public.messages;

-- Recreate single trigger
CREATE TRIGGER trg_award_message_point
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.award_message_point();

-- Remove duplicate comment point triggers, keep only one
DROP TRIGGER IF EXISTS trigger_award_comment_point ON public.comments;
DROP TRIGGER IF EXISTS award_comment_point_trigger ON public.comments;
DROP TRIGGER IF EXISTS award_point_on_comment ON public.comments;

-- Recreate single trigger  
CREATE TRIGGER trg_award_comment_point
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.award_comment_point();

-- Add post point trigger if missing
CREATE OR REPLACE FUNCTION public.award_post_point()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles SET points = points + 1 WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_post_point ON public.posts;
CREATE TRIGGER trg_award_post_point
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.award_post_point();