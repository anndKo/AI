-- Create bills storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bills', 'bills', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload bills
CREATE POLICY "Users can upload bills" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bills' AND auth.uid()::text = split_part(name, '-', 2));

-- Allow everyone to view bills (for admin review)
CREATE POLICY "Bills are public" ON storage.objects
FOR SELECT
USING (bucket_id = 'bills');

-- Allow users to delete their own bills
CREATE POLICY "Users can delete their bills" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'bills' AND auth.uid()::text = split_part(name, '-', 2));

-- Allow admins to manage all bills
CREATE POLICY "Admins can manage all bills" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'bills' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'bills' AND public.has_role(auth.uid(), 'admin'));