
-- Fix founder account
UPDATE public.profiles 
SET points = 100000, is_admin = true 
WHERE user_id = 'cea30634-3e5b-4f37-a738-7c14a35effd9';
