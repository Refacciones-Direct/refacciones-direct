-- Migration 003: Storage buckets
--
-- Product images: public read, for storefront display
-- Excel imports/exports: private, for manufacturer catalog management

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('product-images', 'product-images', true, 5242880),    -- 5MB
  ('excel-imports', 'excel-imports', false, 10485760),     -- 10MB
  ('excel-exports', 'excel-exports', false, 10485760);     -- 10MB

-- Storage policies for product-images (public read)
CREATE POLICY product_images_public_read ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Storage policies for excel-imports (private, service role only for now)
-- Manufacturers will upload via server actions using admin client

-- Storage policies for excel-exports (private, service role only for now)
-- Exports generated server-side and served via signed URLs
