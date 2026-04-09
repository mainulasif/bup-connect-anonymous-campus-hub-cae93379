
-- Simplified posts soft-delete policy
DROP POLICY IF EXISTS "Users can soft-delete posts" ON public.posts;
CREATE POLICY "Users can soft-delete posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Simplified comments soft-delete policy  
DROP POLICY IF EXISTS "Users can soft-delete comments" ON public.comments;
CREATE POLICY "Users can soft-delete comments" ON public.comments
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );
