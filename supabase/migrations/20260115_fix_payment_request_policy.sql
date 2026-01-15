-- Fix RLS policy for payment_requests to include new columns
-- This ensures users can insert payment requests with bill_image

-- Drop the existing policy that may be too restrictive
DROP POLICY IF EXISTS "Users can create requests" ON public.payment_requests;

-- Create a new, more explicit policy that allows all columns
CREATE POLICY "Users can create payment requests"
ON public.payment_requests
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Ensure update works for the new columns (for safety)
DROP POLICY IF EXISTS "Admins can update requests" ON public.payment_requests;

CREATE POLICY "Admins can update payment requests"
ON public.payment_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add a view policy to ensure users can see their requests after creating
DROP POLICY IF EXISTS "Users can view their own requests" ON public.payment_requests;

CREATE POLICY "Users can view own payment requests"
ON public.payment_requests
FOR SELECT
USING (auth.uid() = user_id);
