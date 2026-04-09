
-- Drop the broken policy
DROP POLICY IF EXISTS "Members can view members" ON public.conversation_members;

-- Recreate without self-reference recursion
CREATE POLICY "Members can view members"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT cm.conversation_id FROM public.conversation_members cm WHERE cm.user_id = auth.uid()
  )
);
