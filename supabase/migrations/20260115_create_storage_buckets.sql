-- Create storage buckets for bills and admin uploads

-- Insert bills bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('bills', 'bills', true, false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Insert admin-uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('admin-uploads', 'admin-uploads', true, false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create policy for bills bucket - allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload bills"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bills' 
  AND auth.role() = 'authenticated'
);

-- Create policy for bills bucket - allow public read
CREATE POLICY "Allow public read access to bills"
ON storage.objects FOR SELECT
USING (bucket_id = 'bills');

-- Create policy for admin-uploads bucket - allow authenticated admins to upload
CREATE POLICY "Allow admins to upload to admin-uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'admin-uploads' 
  AND auth.role() = 'authenticated'
);

-- Create policy for admin-uploads bucket - allow public read
CREATE POLICY "Allow public read access to admin-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-uploads');
