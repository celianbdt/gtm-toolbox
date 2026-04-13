-- Add logo_url column to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for workspace logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-logos', 'workspace-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to workspace-logos bucket
CREATE POLICY "Authenticated users can upload workspace logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'workspace-logos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update workspace logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'workspace-logos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete workspace logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'workspace-logos');

-- Allow public read access to workspace logos
CREATE POLICY "Public read access for workspace logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workspace-logos');
