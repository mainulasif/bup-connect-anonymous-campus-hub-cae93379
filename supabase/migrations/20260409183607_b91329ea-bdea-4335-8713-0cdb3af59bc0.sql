
-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "Users can update own membership" ON public.conversation_members;

-- Create new policy: users can update their own membership OR admins/creators can update any member in their group
CREATE POLICY "Users and moderators can update membership"
ON public.conversation_members
FOR UPDATE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_profile_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'creator'
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_profile_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'creator'
  )
);
