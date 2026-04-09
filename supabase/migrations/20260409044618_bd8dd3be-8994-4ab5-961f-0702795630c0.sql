
-- Drop the broken policy
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;

-- Recreate with correct reference
CREATE POLICY "Members can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversations.id
    AND cm.user_id = auth.uid()
  )
  OR type = 'public_group'::conversation_type
);
