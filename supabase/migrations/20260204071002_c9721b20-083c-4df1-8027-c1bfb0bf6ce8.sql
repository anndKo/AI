-- Drop the insecure policy that exposes payment info to everyone
DROP POLICY IF EXISTS "Anyone can view settings" ON public.app_settings;

-- Create a more secure policy - only authenticated users can view settings
-- This prevents anonymous access to bank account information
CREATE POLICY "Authenticated users can view settings"
ON public.app_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);