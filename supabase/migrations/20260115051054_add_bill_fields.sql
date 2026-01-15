-- Add bill_image column to payment_requests for bill image upload
ALTER TABLE public.payment_requests 
ADD COLUMN bill_image TEXT,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_days INTEGER,
ADD COLUMN approved_questions INTEGER,
ADD COLUMN rejection_reason TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
