-- 1. Add policy for admin to view all profiles (for admin panel)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create security definer function to get user email for admin (more secure alternative)
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email 
  FROM public.profiles 
  WHERE user_id = _user_id
  LIMIT 1
$$;