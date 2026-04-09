
-- Drop the overly permissive policies
DROP POLICY "System inserts profiles" ON public.profiles;
DROP POLICY "System inserts roles" ON public.user_roles;

-- Profiles are inserted by the trigger (SECURITY DEFINER), no user-facing INSERT needed
-- But users need to be able to insert their own profile if trigger fails
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Roles are inserted by trigger only
CREATE POLICY "Trigger inserts roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
