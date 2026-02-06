-- Fix RLS policies for bills bucket to allow authenticated users to upload
CREATE POLICY "Users can upload their own bills"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bills' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view bills"
ON storage.objects FOR SELECT
USING (bucket_id = 'bills');

CREATE POLICY "Users can update their own bills"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'bills' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own bills"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bills' 
  AND auth.role() = 'authenticated'
);