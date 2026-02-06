-- Add bill_image_url column to payment_requests
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS bill_image_url text;