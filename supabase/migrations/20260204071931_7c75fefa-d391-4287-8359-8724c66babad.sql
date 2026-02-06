-- Make bills bucket private (prevents anonymous access)
UPDATE storage.buckets
SET public = false
WHERE id = 'bills';

-- Remove overly-permissive policies (created earlier)
DROP POLICY IF EXISTS "Anyone can view bills" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own bills" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own bills" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own bills" ON storage.objects;

-- Secure policies: only owner (folder=userId) or admin can access
CREATE POLICY "Bills owners or admins can view"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bills'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Bills owners can upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bills'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Bills owners or admins can update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'bills'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Bills owners or admins can delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bills'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);