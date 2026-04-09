
-- Create a security definer function to check membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Fix conversation_members SELECT policy
DROP POLICY IF EXISTS "Members can view members" ON public.conversation_members;
CREATE POLICY "Members can view members"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (
  public.is_conversation_member(auth.uid(), conversation_id)
);

-- Fix conversations SELECT policy  
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.is_conversation_member(auth.uid(), id)
  OR type = 'public_group'::conversation_type
);
