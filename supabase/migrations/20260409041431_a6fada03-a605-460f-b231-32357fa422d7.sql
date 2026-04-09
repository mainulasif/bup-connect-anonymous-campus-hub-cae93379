
-- Create function to auto-promote founder
CREATE OR REPLACE FUNCTION public.check_founder_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the founder email
  IF NEW.email = '2252421086@student.bup.edu.bd' THEN
    -- Update profile to admin with 100k points
    UPDATE public.profiles 
    SET points = 100000, is_admin = true 
    WHERE user_id = NEW.id;
    
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- This trigger runs AFTER the profile creation trigger
CREATE TRIGGER check_founder_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_founder_account();
