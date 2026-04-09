
-- Create a security definer function to check if a user is a profile admin
CREATE OR REPLACE FUNCTION public.is_profile_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- Fix posts soft-delete policy using security definer function
DROP POLICY IF EXISTS "Users can soft-delete posts" ON public.posts;
CREATE POLICY "Users can soft-delete posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_profile_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_profile_admin(auth.uid())
  );

-- Fix comments soft-delete policy
DROP POLICY IF EXISTS "Users can soft-delete comments" ON public.comments;
CREATE POLICY "Users can soft-delete comments" ON public.comments
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_profile_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_profile_admin(auth.uid())
  );

-- Fix profiles update policy to avoid self-reference
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_profile_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_profile_admin(auth.uid())
  );
